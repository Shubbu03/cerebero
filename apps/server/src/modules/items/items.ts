import { randomUUID } from 'node:crypto'

import type {
  DuplicateCandidate,
  ItemCommand,
  ItemListSort,
  ItemPage,
  ItemView,
  UpdateItemInput,
} from '@cerebero/contracts'
import { itemListSortSchema } from '@cerebero/contracts'
import { z } from 'zod'

import type {
  CaptureResult,
  ItemId,
  ItemListCursor,
  ItemRecord,
  ItemRecordPatch,
  ItemRepository,
  ItemsModule,
  UserId,
} from './item-types.js'
import { ItemsError, toItemId } from './item-types.js'

const MAX_DUPLICATE_CANDIDATES = 10

const itemCursorSchema = z
  .object({
    createdAt: z.iso.datetime().optional(),
    id: z.uuid(),
    sort: itemListSortSchema,
    status: z.enum(['library', 'archived', 'trashed']),
    titleKey: z.string().max(400).optional(),
    updatedAt: z.iso.datetime().optional(),
  })
  .strict()

export const TRASH_RETENTION_DAYS = 30

type ItemsModuleOptions = {
  clock?: () => Date
  createId?: () => string
  /**
   * Revokes active Share Links when an Item leaves the shareable surface
   * (archive, trash, or permanent delete). Injected to avoid a hard module cycle.
   */
  revokeShareLinks?: (itemId: ItemId) => Promise<void>
  repository: ItemRepository
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined || value.trim().length === 0) {
    return null
  }

  return value.trim()
}

function normalizeOptionalNote(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined || value.trim().length === 0) {
    return null
  }

  return value
}

function normalizeUrl(value: string): { normalized: string; original: string } {
  const original = value.trim()

  try {
    const parsed = new URL(original)
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error('Unsupported URL.')
    }

    parsed.hash = ''

    return {
      normalized: parsed.toString(),
      original,
    }
  } catch {
    throw new ItemsError(
      'INVALID_REQUEST',
      'A valid HTTP or HTTPS URL without embedded credentials is required.',
    )
  }
}

function prepareUrl(value: string | null | undefined): {
  normalizedUrl: string | null
  originalUrl: string | null
} {
  const normalizedInput = normalizeOptionalText(value)
  if (!normalizedInput) {
    return { normalizedUrl: null, originalUrl: null }
  }

  const url = normalizeUrl(normalizedInput)
  return { normalizedUrl: url.normalized, originalUrl: url.original }
}

function assertContent(
  originalUrl: string | null,
  noteMarkdown: string | null,
) {
  if (!originalUrl && !noteMarkdown) {
    throw new ItemsError(
      'INVALID_REQUEST',
      'An Item requires a URL, a Markdown note, or both.',
    )
  }
}

function displayTitle(record: ItemRecord): string {
  if (record.authoredTitle) {
    return record.authoredTitle
  }

  if (record.noteMarkdown) {
    const firstLine = record.noteMarkdown
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean)
    if (firstLine) {
      return firstLine.slice(0, 300)
    }
  }

  if (record.originalUrl) {
    return new URL(record.originalUrl).hostname
  }

  return 'Untitled note'
}

function toItemView(record: ItemRecord): ItemView {
  return {
    authoredTitle: record.authoredTitle,
    createdAt: record.createdAt.toISOString(),
    displayTitle: displayTitle(record),
    id: record.id,
    kind: record.originalUrl ? 'link' : 'note',
    noteMarkdown: record.noteMarkdown,
    originalUrl: record.originalUrl,
    pinnedAt: record.pinnedAt?.toISOString() ?? null,
    status: record.status,
    tags: [...record.tags]
      .map((tag) => ({
        createdAt: tag.createdAt.toISOString(),
        id: tag.id,
        name: tag.name,
      }))
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }) ||
          left.id.localeCompare(right.id),
      ),
    trashedAt: record.trashedAt?.toISOString() ?? null,
    updatedAt: record.updatedAt.toISOString(),
    version: record.version,
  }
}

function toDuplicateCandidate(record: ItemRecord): DuplicateCandidate {
  const item = toItemView(record)
  return {
    authoredTitle: item.authoredTitle,
    createdAt: item.createdAt,
    displayTitle: item.displayTitle,
    id: item.id,
    kind: item.kind,
    originalUrl: item.originalUrl,
    status: item.status,
    updatedAt: item.updatedAt,
  }
}

function titleSortKey(record: ItemRecord): string {
  const value =
    record.authoredTitle?.trim() ||
    record.originalUrl?.trim() ||
    record.noteMarkdown?.trim().slice(0, 300) ||
    'untitled note'
  return value.toLocaleLowerCase('en')
}

function encodeCursor(
  record: ItemRecord,
  status: ItemRecord['status'],
  sort: ItemListSort,
): string {
  const payload: Record<string, string> = {
    id: record.id,
    sort,
    status,
  }

  if (sort === 'created_desc' || sort === 'created_asc') {
    payload.createdAt = record.createdAt.toISOString()
  } else if (sort === 'updated_desc') {
    payload.updatedAt = record.updatedAt.toISOString()
  } else {
    payload.titleKey = titleSortKey(record)
  }

  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function decodeCursor(
  cursor: string | undefined,
  status: ItemRecord['status'],
  sort: ItemListSort,
): ItemListCursor | null {
  if (!cursor) {
    return null
  }

  try {
    const parsed = itemCursorSchema.parse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    )
    if (parsed.status !== status || parsed.sort !== sort) {
      throw new Error('Cursor status or sort mismatch.')
    }

    if (sort === 'created_desc' || sort === 'created_asc') {
      if (!parsed.createdAt) {
        throw new Error('Missing createdAt cursor field.')
      }
      return {
        createdAt: new Date(parsed.createdAt),
        id: toItemId(parsed.id),
      }
    }

    if (sort === 'updated_desc') {
      if (!parsed.updatedAt) {
        throw new Error('Missing updatedAt cursor field.')
      }
      return {
        id: toItemId(parsed.id),
        updatedAt: new Date(parsed.updatedAt),
      }
    }

    if (parsed.titleKey === undefined) {
      throw new Error('Missing titleKey cursor field.')
    }

    return {
      id: toItemId(parsed.id),
      titleKey: parsed.titleKey,
    }
  } catch {
    throw new ItemsError('INVALID_REQUEST', 'The pagination cursor is invalid.')
  }
}

function assertEditable(record: ItemRecord): void {
  if (record.status !== 'library') {
    throw new ItemsError(
      'INVALID_ITEM_STATE',
      'The Item cannot be edited in its current state.',
    )
  }
}

function assertExpectedVersion(
  record: ItemRecord,
  expectedVersion: number,
): void {
  if (record.version !== expectedVersion) {
    throw new ItemsError(
      'EDIT_CONFLICT',
      'The Item changed since it was loaded. Refresh and try again.',
    )
  }
}

function commandPatch(
  record: ItemRecord,
  command: ItemCommand,
  now: Date,
): ItemRecordPatch {
  switch (command.type) {
    case 'pin':
      if (record.status !== 'library' || record.pinnedAt) {
        break
      }
      return { pinnedAt: now, updatedAt: now }
    case 'unpin':
      if (record.status !== 'library' || !record.pinnedAt) {
        break
      }
      return { pinnedAt: null, updatedAt: now }
    case 'archive':
      if (record.status !== 'library') {
        break
      }
      return {
        pinnedAt: null,
        status: 'archived',
        trashedAt: null,
        updatedAt: now,
      }
    case 'trash':
      if (record.status !== 'library' && record.status !== 'archived') {
        break
      }
      return {
        pinnedAt: null,
        status: 'trashed',
        trashedAt: now,
        updatedAt: now,
      }
    case 'restore':
      if (record.status === 'archived') {
        return {
          status: 'library',
          trashedAt: null,
          updatedAt: now,
        }
      }
      if (record.status === 'trashed') {
        return {
          pinnedAt: null,
          status: 'library',
          trashedAt: null,
          updatedAt: now,
        }
      }
      break
    case 'delete_permanently':
      // Handled separately so the repository can remove the row.
      break
  }

  throw new ItemsError(
    'INVALID_ITEM_STATE',
    'The requested action is not valid for the Item.',
  )
}

export function createItemsModule(options: ItemsModuleOptions): ItemsModule {
  const clock = options.clock ?? (() => new Date())
  const createId = options.createId ?? randomUUID

  async function getOwnedRecord(
    actor: UserId,
    itemId: ItemId,
  ): Promise<ItemRecord> {
    const record = await options.repository.findById(actor, itemId)
    if (!record) {
      throw new ItemsError('NOT_FOUND', 'The requested Item was not found.')
    }

    return record
  }

  async function persistUpdate(
    actor: UserId,
    record: ItemRecord,
    expectedVersion: number,
    patch: ItemRecordPatch,
  ): Promise<ItemView> {
    const updated = await options.repository.update(
      actor,
      record.id,
      expectedVersion,
      patch,
    )
    if (!updated) {
      throw new ItemsError(
        'EDIT_CONFLICT',
        'The Item changed since it was loaded. Refresh and try again.',
      )
    }

    return toItemView(updated)
  }

  async function revokeShares(itemId: ItemId): Promise<void> {
    if (options.revokeShareLinks) {
      await options.revokeShareLinks(itemId)
    }
  }

  return {
    act: async (actor, itemId, command) => {
      const record = await getOwnedRecord(actor, itemId)
      assertExpectedVersion(record, command.expectedVersion)

      if (command.type === 'delete_permanently') {
        if (record.status !== 'trashed') {
          throw new ItemsError(
            'INVALID_ITEM_STATE',
            'Only trashed Items can be permanently deleted.',
          )
        }

        const deleted = await options.repository.deletePermanently(
          actor,
          record.id,
          command.expectedVersion,
        )
        if (!deleted) {
          throw new ItemsError(
            'EDIT_CONFLICT',
            'The Item changed since it was loaded. Refresh and try again.',
          )
        }

        await revokeShares(record.id)

        // Permanent deletion has no remaining projection; callers treat 204 as success.
        // Keep the act signature returning ItemView for non-delete commands by
        // returning the pre-delete view for clients that still parse a body.
        return toItemView(record)
      }

      const patch = commandPatch(record, command, clock())
      const updated = await persistUpdate(
        actor,
        record,
        command.expectedVersion,
        patch,
      )

      if (command.type === 'archive' || command.type === 'trash') {
        await revokeShares(record.id)
      }

      return updated
    },

    capture: async (actor, input): Promise<CaptureResult> => {
      const url = prepareUrl(input.originalUrl)
      const authoredTitle = normalizeOptionalText(input.authoredTitle)
      const noteMarkdown = normalizeOptionalNote(input.noteMarkdown)
      assertContent(url.originalUrl, noteMarkdown)

      const now = clock()
      const persisted = await options.repository.createCapture(
        {
          authoredTitle,
          createdAt: now,
          id: toItemId(createId()),
          normalizedUrl: url.normalizedUrl,
          noteMarkdown,
          originalUrl: url.originalUrl,
          ownerId: actor,
          pinnedAt: null,
          status: 'library',
          tags: [],
          trashedAt: null,
          updatedAt: now,
          version: 1,
        },
        {
          allowDuplicate: input.allowDuplicate ?? false,
          duplicateLimit: MAX_DUPLICATE_CANDIDATES,
        },
      )

      if (persisted.outcome === 'duplicate') {
        return {
          candidates: persisted.records.map(toDuplicateCandidate),
          outcome: 'duplicate',
        }
      }

      return { item: toItemView(persisted.record), outcome: 'created' }
    },

    findDuplicateLinks: async (actor, url) => {
      const normalizedUrl = normalizeUrl(url).normalized
      const records = await options.repository.findDuplicates(
        actor,
        normalizedUrl,
        MAX_DUPLICATE_CANDIDATES,
      )
      return records.map(toDuplicateCandidate)
    },

    get: async (actor, itemId) => {
      const record = await options.repository.findById(actor, itemId)
      return record ? toItemView(record) : null
    },

    list: async (actor, query): Promise<ItemPage> => {
      const sort = query.sort
      const cursor = decodeCursor(query.cursor, query.status, sort)
      const tagIds = query.tag?.length ? query.tag : null
      const records = await options.repository.list(actor, {
        cursor,
        kind: query.kind ?? null,
        limit: query.limit + 1,
        pinned: query.pinned ?? null,
        sort,
        status: query.status,
        tagIds,
      })
      const hasNextPage = records.length > query.limit
      const pageRecords = hasNextPage ? records.slice(0, query.limit) : records
      const lastRecord = pageRecords.at(-1)

      return {
        items: pageRecords.map(toItemView),
        nextCursor:
          hasNextPage && lastRecord
            ? encodeCursor(lastRecord, query.status, sort)
            : null,
      }
    },

    update: async (actor, itemId, patch: UpdateItemInput) => {
      const record = await getOwnedRecord(actor, itemId)
      assertExpectedVersion(record, patch.expectedVersion)
      assertEditable(record)

      const url =
        patch.originalUrl === undefined
          ? {
              normalizedUrl: record.normalizedUrl,
              originalUrl: record.originalUrl,
            }
          : prepareUrl(patch.originalUrl)
      const authoredTitle =
        patch.authoredTitle === undefined
          ? record.authoredTitle
          : normalizeOptionalText(patch.authoredTitle)
      const noteMarkdown =
        patch.noteMarkdown === undefined
          ? record.noteMarkdown
          : normalizeOptionalNote(patch.noteMarkdown)
      assertContent(url.originalUrl, noteMarkdown)

      return persistUpdate(actor, record, patch.expectedVersion, {
        authoredTitle,
        normalizedUrl: url.normalizedUrl,
        noteMarkdown,
        originalUrl: url.originalUrl,
        updatedAt: clock(),
      })
    },
  }
}
