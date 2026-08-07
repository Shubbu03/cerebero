import type {
  ItemId,
  ItemListOptions,
  ItemRecord,
  ItemRecordPatch,
  ItemRepository,
  UserId,
} from '../../src/modules/items/item-types.js'

function cloneRecord(record: ItemRecord): ItemRecord {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
    enrichment: record.enrichment
      ? {
          ...record.enrichment,
          enrichedAt: record.enrichment.enrichedAt
            ? new Date(record.enrichment.enrichedAt)
            : null,
          nextAttemptAt: record.enrichment.nextAttemptAt
            ? new Date(record.enrichment.nextAttemptAt)
            : null,
        }
      : null,
    pinnedAt: record.pinnedAt ? new Date(record.pinnedAt) : null,
    tags: record.tags.map((tag) => ({
      ...tag,
      createdAt: new Date(tag.createdAt),
    })),
    trashedAt: record.trashedAt ? new Date(record.trashedAt) : null,
    updatedAt: new Date(record.updatedAt),
  }
}

function isAfterCursor(record: ItemRecord, options: ItemListOptions): boolean {
  if (!options.cursor) {
    return true
  }

  const timeDifference =
    record.createdAt.getTime() - options.cursor.createdAt.getTime()
  return (
    timeDifference < 0 ||
    (timeDifference === 0 && record.id < options.cursor.id)
  )
}

export class InMemoryItemsRepository implements ItemRepository {
  readonly enrichmentItemIds = new Set<ItemId>()
  readonly jobItemIds = new Set<ItemId>()
  readonly records = new Map<ItemId, ItemRecord>()

  async createCapture(record: ItemRecord): Promise<ItemRecord> {
    const stored = cloneRecord(record)
    this.records.set(stored.id, stored)
    if (stored.originalUrl) {
      this.enrichmentItemIds.add(stored.id)
      this.jobItemIds.add(stored.id)
    }
    return Promise.resolve(cloneRecord(stored))
  }

  async deletePermanently(
    ownerId: UserId,
    itemId: ItemId,
    expectedVersion: number,
  ): Promise<boolean> {
    const current = this.records.get(itemId)
    if (
      !current ||
      current.ownerId !== ownerId ||
      current.version !== expectedVersion ||
      current.status !== 'trashed'
    ) {
      return Promise.resolve(false)
    }

    this.records.delete(itemId)
    this.enrichmentItemIds.delete(itemId)
    this.jobItemIds.delete(itemId)
    return Promise.resolve(true)
  }

  async findById(ownerId: UserId, itemId: ItemId): Promise<ItemRecord | null> {
    const record = this.records.get(itemId)
    return Promise.resolve(
      record?.ownerId === ownerId ? cloneRecord(record) : null,
    )
  }

  async findDuplicates(
    ownerId: UserId,
    normalizedUrl: string,
    limit: number,
  ): Promise<readonly ItemRecord[]> {
    return Promise.resolve(
      [...this.records.values()]
        .filter(
          (record) =>
            record.ownerId === ownerId &&
            record.normalizedUrl === normalizedUrl &&
            record.status !== 'trashed',
        )
        .sort(
          (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime() ||
            right.id.localeCompare(left.id),
        )
        .slice(0, limit)
        .map(cloneRecord),
    )
  }

  async list(
    ownerId: UserId,
    options: ItemListOptions,
  ): Promise<readonly ItemRecord[]> {
    return Promise.resolve(
      [...this.records.values()]
        .filter((record) => {
          if (record.ownerId !== ownerId || record.status !== options.status) {
            return false
          }
          if (!isAfterCursor(record, options)) {
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
            const attached = new Set(
              record.tags.map((tag) => tag.id as string),
            )
            if (!options.tagIds.every((tagId) => attached.has(tagId))) {
              return false
            }
          }
          return true
        })
        .sort(
          (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime() ||
            right.id.localeCompare(left.id),
        )
        .slice(0, options.limit)
        .map(cloneRecord),
    )
  }

  async update(
    ownerId: UserId,
    itemId: ItemId,
    expectedVersion: number,
    patch: ItemRecordPatch,
    enrichmentMode: 'preserve' | 'remove' | 'reset',
  ): Promise<ItemRecord | null> {
    const current = this.records.get(itemId)
    if (
      !current ||
      current.ownerId !== ownerId ||
      current.version !== expectedVersion
    ) {
      return Promise.resolve(null)
    }

    const updated = cloneRecord({
      ...current,
      ...patch,
      version: current.version + 1,
    })
    this.records.set(itemId, updated)
    if (enrichmentMode === 'remove') {
      updated.enrichment = null
      this.enrichmentItemIds.delete(itemId)
      this.jobItemIds.delete(itemId)
    } else if (enrichmentMode === 'reset') {
      updated.enrichment = {
        attemptCount: 0,
        canonicalUrl: null,
        description: null,
        enrichedAt: null,
        extractedTitle: null,
        faviconUrl: null,
        imageUrl: null,
        lastErrorCode: null,
        nextAttemptAt: patch.updatedAt ?? updated.updatedAt,
        provider: null,
        siteName: null,
        state: 'pending',
      }
      this.enrichmentItemIds.add(itemId)
      this.jobItemIds.add(itemId)
    }
    return Promise.resolve(cloneRecord(updated))
  }
}
