import type { ItemId, UserId } from '../../src/modules/items/item-types.js'
import type {
  ShareableItemSnapshot,
  ShareLinkRecord,
  ShareLinksRepository,
} from '../../src/modules/sharing/share-types.js'

function cloneShare(record: ShareLinkRecord): ShareLinkRecord {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
    revokedAt: record.revokedAt ? new Date(record.revokedAt) : null,
  }
}

function cloneItem(item: ShareableItemSnapshot): ShareableItemSnapshot {
  return { ...item }
}

export class InMemoryShareLinksRepository implements ShareLinksRepository {
  readonly items = new Map<string, ShareableItemSnapshot>()
  readonly records: ShareLinkRecord[] = []

  seedItem(item: ShareableItemSnapshot): void {
    this.items.set(item.id, cloneItem(item))
  }

  async createActive(record: ShareLinkRecord): Promise<ShareLinkRecord> {
    const hasActive = this.records.some(
      (candidate) =>
        candidate.itemId === record.itemId && candidate.revokedAt === null,
    )
    if (hasActive) {
      throw new Error('ACTIVE_SHARE_EXISTS')
    }

    if (
      this.records.some((candidate) => candidate.tokenHash === record.tokenHash)
    ) {
      throw new Error('ACTIVE_SHARE_EXISTS')
    }

    const stored = cloneShare(record)
    this.records.push(stored)
    return Promise.resolve(cloneShare(stored))
  }

  async findActiveByItem(
    ownerId: UserId,
    itemId: ItemId,
  ): Promise<ShareLinkRecord | null> {
    const match = this.records.find(
      (record) =>
        record.ownerId === ownerId &&
        record.itemId === itemId &&
        record.revokedAt === null,
    )
    return Promise.resolve(match ? cloneShare(match) : null)
  }

  async findActiveByTokenHash(
    tokenHash: string,
  ): Promise<ShareLinkRecord | null> {
    const match = this.records.find(
      (record) => record.tokenHash === tokenHash && record.revokedAt === null,
    )
    return Promise.resolve(match ? cloneShare(match) : null)
  }

  async findShareableItem(
    ownerId: UserId,
    itemId: ItemId,
  ): Promise<ShareableItemSnapshot | null> {
    const item = this.items.get(itemId)
    return Promise.resolve(
      item && item.ownerId === ownerId ? cloneItem(item) : null,
    )
  }

  async findShareableItemById(
    itemId: ItemId,
  ): Promise<ShareableItemSnapshot | null> {
    const item = this.items.get(itemId)
    return Promise.resolve(item ? cloneItem(item) : null)
  }

  async revokeActiveForItem(
    ownerId: UserId,
    itemId: ItemId,
    revokedAt: Date,
  ): Promise<boolean> {
    const match = this.records.find(
      (record) =>
        record.ownerId === ownerId &&
        record.itemId === itemId &&
        record.revokedAt === null,
    )
    if (!match) {
      return Promise.resolve(false)
    }

    match.revokedAt = new Date(revokedAt)
    return Promise.resolve(true)
  }

  async revokeAllActiveForItem(
    itemId: ItemId,
    revokedAt: Date,
  ): Promise<number> {
    let count = 0
    for (const record of this.records) {
      if (record.itemId === itemId && record.revokedAt === null) {
        record.revokedAt = new Date(revokedAt)
        count += 1
      }
    }
    return Promise.resolve(count)
  }

  async rotateActive(
    ownerId: UserId,
    itemId: ItemId,
    next: ShareLinkRecord,
    revokedAt: Date,
  ): Promise<ShareLinkRecord | null> {
    const revoked = await this.revokeActiveForItem(ownerId, itemId, revokedAt)
    if (!revoked) {
      return null
    }

    return this.createActive(next)
  }
}
