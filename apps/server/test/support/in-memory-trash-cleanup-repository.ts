import type { ItemRecord } from '../../src/modules/items/item-types.js'
import type { TrashCleanupRepository } from '../../src/modules/cleanup/cleanup-types.js'

export class InMemoryTrashCleanupRepository implements TrashCleanupRepository {
  readonly records = new Map<string, ItemRecord>()

  seed(record: ItemRecord): void {
    this.records.set(record.id, {
      ...record,
      createdAt: new Date(record.createdAt),
      pinnedAt: record.pinnedAt ? new Date(record.pinnedAt) : null,
      tags: record.tags.map((tag) => ({
        ...tag,
        createdAt: new Date(tag.createdAt),
      })),
      trashedAt: record.trashedAt ? new Date(record.trashedAt) : null,
      updatedAt: new Date(record.updatedAt),
    })
  }

  async deleteExpiredTrash(cutoff: Date, limit: number): Promise<number> {
    const expired = [...this.records.values()]
      .filter(
        (record) =>
          record.status === 'trashed' &&
          record.trashedAt !== null &&
          record.trashedAt.getTime() < cutoff.getTime(),
      )
      .sort(
        (left, right) =>
          (left.trashedAt?.getTime() ?? 0) - (right.trashedAt?.getTime() ?? 0) ||
          left.id.localeCompare(right.id),
      )
      .slice(0, limit)

    for (const record of expired) {
      this.records.delete(record.id)
    }

    return Promise.resolve(expired.length)
  }
}
