import type { ItemRecord, UserId } from '../../src/modules/items/item-types.js'
import type {
  SearchHit,
  SearchRepository,
  SearchRepositoryOptions,
} from '../../src/modules/search/search-types.js'

function cloneRecord(record: ItemRecord): ItemRecord {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
    pinnedAt: record.pinnedAt ? new Date(record.pinnedAt) : null,
    tags: record.tags.map((tag) => ({
      ...tag,
      createdAt: new Date(tag.createdAt),
    })),
    trashedAt: record.trashedAt ? new Date(record.trashedAt) : null,
    updatedAt: new Date(record.updatedAt),
  }
}

function searchableText(record: ItemRecord): {
  authored: string
  note: string
  tags: string
  url: string
} {
  return {
    authored: record.authoredTitle ?? '',
    note: record.noteMarkdown ?? '',
    tags: record.tags.map((tag) => tag.name).join(' '),
    url: `${record.originalUrl ?? ''} ${record.normalizedUrl ?? ''}`,
  }
}

function score(record: ItemRecord, query: string): number {
  const normalized = query.toLowerCase()
  const fields = searchableText(record)
  let rank = 0

  if (fields.authored.toLowerCase().includes(normalized)) {
    rank += 1.0
  }
  if (fields.note.toLowerCase().includes(normalized)) {
    rank += 0.6
  }
  if (fields.tags.toLowerCase().includes(normalized)) {
    rank += 0.55
  }
  if (fields.url.toLowerCase().includes(normalized)) {
    rank += 0.2
  }

  return rank
}

export class InMemorySearchRepository implements SearchRepository {
  readonly records = new Map<string, ItemRecord>()

  seed(record: ItemRecord): void {
    this.records.set(record.id, cloneRecord(record))
  }

  async search(
    ownerId: UserId,
    options: SearchRepositoryOptions,
  ): Promise<readonly SearchHit[]> {
    const hits = [...this.records.values()]
      .filter((record) => {
        if (record.ownerId !== ownerId) {
          return false
        }
        if (options.status) {
          if (record.status !== options.status) {
            return false
          }
        } else if (record.status === 'trashed') {
          return false
        }
        if (options.kind === 'link' && !record.originalUrl) {
          return false
        }
        if (options.kind === 'note' && record.originalUrl) {
          return false
        }
        if (options.pinned === true && !record.pinnedAt) {
          return false
        }
        if (options.pinned === false && record.pinnedAt) {
          return false
        }
        if (options.tagIds && options.tagIds.length > 0) {
          const attached = new Set(record.tags.map((tag) => tag.id as string))
          if (!options.tagIds.every((tagId) => attached.has(tagId))) {
            return false
          }
        }

        return score(record, options.query) > 0
      })
      .map((record) => ({
        rank: score(record, options.query),
        record: cloneRecord(record),
      }))
      .sort(
        (left, right) =>
          right.rank - left.rank ||
          right.record.createdAt.getTime() - left.record.createdAt.getTime() ||
          right.record.id.localeCompare(left.record.id),
      )

    const afterCursor = options.cursor
      ? hits.filter((hit) => {
          if (hit.rank < options.cursor!.rank) {
            return true
          }
          if (hit.rank > options.cursor!.rank) {
            return false
          }
          const time =
            hit.record.createdAt.getTime() - options.cursor!.createdAt.getTime()
          return time < 0 || (time === 0 && hit.record.id < options.cursor!.id)
        })
      : hits

    return Promise.resolve(afterCursor.slice(0, options.limit))
  }
}
