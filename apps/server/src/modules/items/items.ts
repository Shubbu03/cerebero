import { randomUUID } from 'node:crypto'

import type {
  DuplicateCandidate,
  ItemCommand,
  ItemPage,
  ItemView,
  UpdateItemInput,
} from '@cerebero/contracts'
import { z } from 'zod'

import type {
  CaptureResult,
  ItemId,
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
    createdAt: z.string().datetime(),
    id: z.string().uuid(),
    status: z.enum(['inbox', 'library']),
  })
  .strict()

type ItemsModuleOptions = {
  clock?: () => Date
  createId?: () => string
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

  if (record.enrichment?.extractedTitle) {
    return record.enrichment.extractedTitle.slice(0, 300)
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
    enrichment: record.enrichment
      ? {
          ...record.enrichment,
          enrichedAt: record.enrichment.enrichedAt?.toISOString() ?? null,
          nextAttemptAt: record.enrichment.nextAttemptAt?.toISOString() ?? null,
        }
      : null,
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

function encodeCursor(record: ItemRecord, status: 'inbox' | 'library'): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: record.createdAt.toISOString(),
      id: record.id,
      status,
    }),
  ).toString('base64url')
}

function decodeCursor(cursor: string | undefined, status: 'inbox' | 'library') {
  if (!cursor) {
    return null
  }

  try {
    const parsed = itemCursorSchema.parse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    )
    if (parsed.status !== status) {
      throw new Error('Cursor status mismatch.')
    }

    return {
      createdAt: new Date(parsed.createdAt),
      id: toItemId(parsed.id),
    }
  } catch {
    throw new ItemsError('INVALID_REQUEST', 'The pagination cursor is invalid.')
  }
}

function assertEditable(record: ItemRecord): void {
  if (record.status !== 'inbox' && record.status !== 'library') {
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
    case 'file':
      if (record.status !== 'inbox') {
        break
      }
      return { status: 'library', updatedAt: now }
    case 'move_to_inbox':
      if (record.status !== 'library') {
        break
      }
      return { status: 'inbox', updatedAt: now }
    case 'pin':
      if (
        (record.status !== 'inbox' && record.status !== 'library') ||
        record.pinnedAt
      ) {
        break
      }
      return { pinnedAt: now, updatedAt: now }
    case 'unpin':
      if (
        (record.status !== 'inbox' && record.status !== 'library') ||
        !record.pinnedAt
      ) {
        break
      }
      return { pinnedAt: null, updatedAt: now }
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
    enrichmentMode: 'preserve' | 'remove' | 'reset' = 'preserve',
  ): Promise<ItemView> {
    const updated = await options.repository.update(
      actor,
      record.id,
      expectedVersion,
      patch,
      enrichmentMode,
    )
    if (!updated) {
      throw new ItemsError(
        'EDIT_CONFLICT',
        'The Item changed since it was loaded. Refresh and try again.',
      )
    }

    return toItemView(updated)
  }

  return {
    act: async (actor, itemId, command) => {
      const record = await getOwnedRecord(actor, itemId)
      assertExpectedVersion(record, command.expectedVersion)
      const patch = commandPatch(record, command, clock())
      return persistUpdate(actor, record, command.expectedVersion, patch)
    },

    capture: async (actor, input): Promise<CaptureResult> => {
      const url = prepareUrl(input.originalUrl)
      const authoredTitle = normalizeOptionalText(input.authoredTitle)
      const noteMarkdown = normalizeOptionalNote(input.noteMarkdown)
      assertContent(url.originalUrl, noteMarkdown)

      if (url.normalizedUrl && !input.allowDuplicate) {
        const duplicates = await options.repository.findDuplicates(
          actor,
          url.normalizedUrl,
          MAX_DUPLICATE_CANDIDATES,
        )
        if (duplicates.length > 0) {
          return {
            candidates: duplicates.map(toDuplicateCandidate),
            outcome: 'duplicate',
          }
        }
      }

      const now = clock()
      const created = await options.repository.createCapture({
        authoredTitle,
        createdAt: now,
        enrichment: url.originalUrl
          ? {
              attemptCount: 0,
              canonicalUrl: null,
              description: null,
              enrichedAt: null,
              extractedTitle: null,
              faviconUrl: null,
              imageUrl: null,
              lastErrorCode: null,
              nextAttemptAt: now,
              provider: null,
              siteName: null,
              state: 'pending',
            }
          : null,
        id: toItemId(createId()),
        normalizedUrl: url.normalizedUrl,
        noteMarkdown,
        originalUrl: url.originalUrl,
        ownerId: actor,
        pinnedAt: null,
        status: 'inbox',
        tags: [],
        trashedAt: null,
        updatedAt: now,
        version: 1,
      })

      return { item: toItemView(created), outcome: 'created' }
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
      const cursor = decodeCursor(query.cursor, query.status)
      const records = await options.repository.list(actor, {
        cursor,
        limit: query.limit + 1,
        status: query.status,
      })
      const hasNextPage = records.length > query.limit
      const pageRecords = hasNextPage ? records.slice(0, query.limit) : records
      const lastRecord = pageRecords.at(-1)

      return {
        items: pageRecords.map(toItemView),
        nextCursor:
          hasNextPage && lastRecord
            ? encodeCursor(lastRecord, query.status)
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

      const enrichmentMode =
        patch.originalUrl === undefined
          ? 'preserve'
          : !url.originalUrl
            ? 'remove'
            : url.normalizedUrl !== record.normalizedUrl
              ? 'reset'
              : 'preserve'

      return persistUpdate(
        actor,
        record,
        patch.expectedVersion,
        {
          authoredTitle,
          normalizedUrl: url.normalizedUrl,
          noteMarkdown,
          originalUrl: url.originalUrl,
          updatedAt: clock(),
        },
        enrichmentMode,
      )
    },
  }
}
