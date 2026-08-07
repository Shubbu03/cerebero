import type { ItemId, UserId } from '../../src/modules/items/item-types.js'
import type {
  OwnedResourceRef,
  TagId,
  TagRecord,
  TagRepository,
  TagSummary,
} from '../../src/modules/tags/tag-types.js'

function cloneTag(record: TagRecord): TagRecord {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
  }
}

function cloneSummary(tag: TagSummary): TagSummary {
  return {
    ...tag,
    createdAt: new Date(tag.createdAt),
  }
}

function attachmentKey(itemId: ItemId, tagId: TagId): string {
  return `${itemId}:${tagId}`
}

export class InMemoryTagsRepository implements TagRepository {
  readonly attachments = new Map<
    string,
    { createdAt: Date; itemId: ItemId; ownerId: UserId; tagId: TagId }
  >()
  readonly items = new Map<ItemId, OwnedResourceRef>()
  readonly records = new Map<TagId, TagRecord>()

  seedItem(ownerId: UserId, itemId: ItemId): void {
    this.items.set(itemId, { id: itemId, ownerId })
  }

  async attach(
    ownerId: UserId,
    itemId: ItemId,
    tagId: TagId,
    createdAt: Date,
  ): Promise<'attached' | 'already_attached' | null> {
    const item = this.items.get(itemId)
    const tag = this.records.get(tagId)
    if (!item || item.ownerId !== ownerId || !tag || tag.ownerId !== ownerId) {
      return Promise.resolve(null)
    }

    const key = attachmentKey(itemId, tagId)
    if (this.attachments.has(key)) {
      return Promise.resolve('already_attached')
    }

    this.attachments.set(key, {
      createdAt: new Date(createdAt),
      itemId,
      ownerId,
      tagId,
    })
    return Promise.resolve('attached')
  }

  async countItemTags(ownerId: UserId, itemId: ItemId): Promise<number> {
    return Promise.resolve(
      [...this.attachments.values()].filter(
        (attachment) =>
          attachment.ownerId === ownerId && attachment.itemId === itemId,
      ).length,
    )
  }

  async create(record: TagRecord): Promise<TagRecord> {
    const duplicate = [...this.records.values()].some(
      (existing) =>
        existing.ownerId === record.ownerId &&
        existing.normalizedName === record.normalizedName,
    )
    if (duplicate) {
      throw new Error('DUPLICATE_TAG')
    }

    const stored = cloneTag(record)
    this.records.set(stored.id, stored)
    return Promise.resolve(cloneTag(stored))
  }

  async delete(ownerId: UserId, tagId: TagId): Promise<boolean> {
    const current = this.records.get(tagId)
    if (!current || current.ownerId !== ownerId) {
      return Promise.resolve(false)
    }

    this.records.delete(tagId)
    for (const [key, attachment] of this.attachments) {
      if (attachment.tagId === tagId) {
        this.attachments.delete(key)
      }
    }
    return Promise.resolve(true)
  }

  async detach(
    ownerId: UserId,
    itemId: ItemId,
    tagId: TagId,
  ): Promise<boolean> {
    const key = attachmentKey(itemId, tagId)
    const attachment = this.attachments.get(key)
    if (!attachment || attachment.ownerId !== ownerId) {
      return Promise.resolve(false)
    }

    this.attachments.delete(key)
    return Promise.resolve(true)
  }

  async findById(ownerId: UserId, tagId: TagId): Promise<TagRecord | null> {
    const record = this.records.get(tagId)
    return Promise.resolve(
      record?.ownerId === ownerId ? cloneTag(record) : null,
    )
  }

  async findByNormalizedName(
    ownerId: UserId,
    normalizedName: string,
  ): Promise<TagRecord | null> {
    const record = [...this.records.values()].find(
      (candidate) =>
        candidate.ownerId === ownerId &&
        candidate.normalizedName === normalizedName,
    )
    return Promise.resolve(record ? cloneTag(record) : null)
  }

  async findItemRef(
    ownerId: UserId,
    itemId: ItemId,
  ): Promise<OwnedResourceRef | null> {
    const item = this.items.get(itemId)
    return Promise.resolve(
      item?.ownerId === ownerId ? { ...item } : null,
    )
  }

  async list(ownerId: UserId): Promise<readonly TagRecord[]> {
    return Promise.resolve(
      [...this.records.values()]
        .filter((record) => record.ownerId === ownerId)
        .sort(
          (left, right) =>
            left.normalizedName.localeCompare(right.normalizedName) ||
            left.id.localeCompare(right.id),
        )
        .map(cloneTag),
    )
  }

  async listForItem(
    ownerId: UserId,
    itemId: ItemId,
  ): Promise<readonly TagSummary[]> {
    const tags = [...this.attachments.values()]
      .filter(
        (attachment) =>
          attachment.ownerId === ownerId && attachment.itemId === itemId,
      )
      .map((attachment) => this.records.get(attachment.tagId))
      .filter((tag): tag is TagRecord => Boolean(tag && tag.ownerId === ownerId))
      .sort(
        (left, right) =>
          left.normalizedName.localeCompare(right.normalizedName) ||
          left.id.localeCompare(right.id),
      )
      .map((tag) =>
        cloneSummary({
          createdAt: tag.createdAt,
          id: tag.id,
          name: tag.name,
        }),
      )

    return Promise.resolve(tags)
  }

  async listForItems(
    ownerId: UserId,
    itemIds: readonly ItemId[],
  ): Promise<ReadonlyMap<ItemId, readonly TagSummary[]>> {
    const result = new Map<ItemId, TagSummary[]>()
    for (const itemId of itemIds) {
      result.set(itemId, [...(await this.listForItem(ownerId, itemId))])
    }
    return result
  }

  async rename(
    ownerId: UserId,
    tagId: TagId,
    name: string,
    normalizedName: string,
  ): Promise<TagRecord | null> {
    const current = this.records.get(tagId)
    if (!current || current.ownerId !== ownerId) {
      return Promise.resolve(null)
    }

    const conflict = [...this.records.values()].find(
      (candidate) =>
        candidate.ownerId === ownerId &&
        candidate.normalizedName === normalizedName &&
        candidate.id !== tagId,
    )
    if (conflict) {
      throw new Error('DUPLICATE_TAG')
    }

    const updated = cloneTag({
      ...current,
      name,
      normalizedName,
    })
    this.records.set(tagId, updated)
    return Promise.resolve(cloneTag(updated))
  }
}
