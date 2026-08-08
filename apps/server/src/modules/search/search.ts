import type { ItemPage, ItemView, SearchQuery } from '@cerebero/contracts'
import { z } from 'zod'

import type { ItemRecord, UserId } from '../items/item-types.js'
import type {
  SearchHit,
  SearchModule,
  SearchRepository,
} from './search-types.js'
import { SearchError } from './search-types.js'

const searchCursorSchema = z
  .object({
    createdAt: z.string().datetime(),
    id: z.string().uuid(),
    rank: z.number(),
  })
  .strict()

type SearchModuleOptions = {
  repository: SearchRepository
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

function encodeCursor(hit: SearchHit): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: hit.record.createdAt.toISOString(),
      id: hit.record.id,
      rank: hit.rank,
    }),
  ).toString('base64url')
}

function decodeCursor(cursor: string | undefined) {
  if (!cursor) {
    return null
  }

  try {
    const parsed = searchCursorSchema.parse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    )
    return {
      createdAt: new Date(parsed.createdAt),
      id: parsed.id,
      rank: parsed.rank,
    }
  } catch {
    throw new SearchError(
      'INVALID_REQUEST',
      'The pagination cursor is invalid.',
    )
  }
}

export function createSearchModule(options: SearchModuleOptions): SearchModule {
  return {
    search: async (actor: UserId, query: SearchQuery): Promise<ItemPage> => {
      const normalizedQuery = query.q.trim()
      if (normalizedQuery.length === 0) {
        throw new SearchError('INVALID_REQUEST', 'A search query is required.')
      }

      const cursor = decodeCursor(query.cursor)
      const hits = await options.repository.search(actor, {
        cursor,
        kind: query.kind ?? null,
        limit: query.limit + 1,
        pinned: query.pinned ?? null,
        query: normalizedQuery,
        status: query.status ?? null,
        tagIds: query.tag?.length ? query.tag : null,
      })

      const hasNextPage = hits.length > query.limit
      const pageHits = hasNextPage ? hits.slice(0, query.limit) : hits
      const lastHit = pageHits.at(-1)

      return {
        items: pageHits.map((hit) => toItemView(hit.record)),
        nextCursor: hasNextPage && lastHit ? encodeCursor(lastHit) : null,
      }
    },
  }
}
