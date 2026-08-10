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
    pinnedAt: record.pinnedAt ? new Date(record.pinnedAt) : null,
    tags: record.tags.map((tag) => ({
      ...tag,
      createdAt: new Date(tag.createdAt),
    })),
    trashedAt: record.trashedAt ? new Date(record.trashedAt) : null,
    updatedAt: new Date(record.updatedAt),
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

function isAfterCursor(record: ItemRecord, options: ItemListOptions): boolean {
  if (!options.cursor) {
    return true
  }

  const cursor = options.cursor

  if (options.sort === 'created_desc') {
    if (!cursor.createdAt) {
      return false
    }
    const timeDifference =
      record.createdAt.getTime() - cursor.createdAt.getTime()
    return timeDifference < 0 || (timeDifference === 0 && record.id < cursor.id)
  }

  if (options.sort === 'created_asc') {
    if (!cursor.createdAt) {
      return false
    }
    const timeDifference =
      record.createdAt.getTime() - cursor.createdAt.getTime()
    return timeDifference > 0 || (timeDifference === 0 && record.id > cursor.id)
  }

  if (options.sort === 'updated_desc') {
    if (!cursor.updatedAt) {
      return false
    }
    const timeDifference =
      record.updatedAt.getTime() - cursor.updatedAt.getTime()
    return timeDifference < 0 || (timeDifference === 0 && record.id < cursor.id)
  }

  if (cursor.titleKey === undefined) {
    return false
  }

  const titleKey = titleSortKey(record)
  return (
    titleKey > cursor.titleKey ||
    (titleKey === cursor.titleKey && record.id > cursor.id)
  )
}

function compareForSort(
  left: ItemRecord,
  right: ItemRecord,
  sort: ItemListOptions['sort'],
): number {
  if (sort === 'created_asc') {
    return (
      left.createdAt.getTime() - right.createdAt.getTime() ||
      left.id.localeCompare(right.id)
    )
  }

  if (sort === 'updated_desc') {
    return (
      right.updatedAt.getTime() - left.updatedAt.getTime() ||
      right.id.localeCompare(left.id)
    )
  }

  if (sort === 'title_asc') {
    return (
      titleSortKey(left).localeCompare(titleSortKey(right), 'en') ||
      left.id.localeCompare(right.id)
    )
  }

  return (
    right.createdAt.getTime() - left.createdAt.getTime() ||
    right.id.localeCompare(left.id)
  )
}

export class InMemoryItemsRepository implements ItemRepository {
  readonly records = new Map<ItemId, ItemRecord>()

  async createCapture(
    record: ItemRecord,
    options: { allowDuplicate: boolean; duplicateLimit: number },
  ): ReturnType<ItemRepository['createCapture']> {
    if (record.normalizedUrl && !options.allowDuplicate) {
      const duplicates = [...this.records.values()]
        .filter(
          (candidate) =>
            candidate.ownerId === record.ownerId &&
            candidate.normalizedUrl === record.normalizedUrl &&
            candidate.status !== 'trashed',
        )
        .sort(
          (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime() ||
            right.id.localeCompare(left.id),
        )
        .slice(0, options.duplicateLimit)
        .map(cloneRecord)

      if (duplicates.length > 0) {
        return Promise.resolve({ outcome: 'duplicate', records: duplicates })
      }
    }

    const stored = cloneRecord(record)
    this.records.set(stored.id, stored)
    return Promise.resolve({ outcome: 'created', record: cloneRecord(stored) })
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
            const attached = new Set(record.tags.map((tag) => tag.id as string))
            if (!options.tagIds.every((tagId) => attached.has(tagId))) {
              return false
            }
          }
          return true
        })
        .sort((left, right) => compareForSort(left, right, options.sort))
        .slice(0, options.limit)
        .map(cloneRecord),
    )
  }

  async update(
    ownerId: UserId,
    itemId: ItemId,
    expectedVersion: number,
    patch: ItemRecordPatch,
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
    return Promise.resolve(cloneRecord(updated))
  }
}
