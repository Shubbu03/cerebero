import type {
  ItemStatus,
  PublicSharedItem,
  ShareLinkCreated,
  ShareLinkStatus,
} from '@cerebero/contracts'

import type { ItemId, UserId } from '../items/item-types.js'

declare const shareLinkIdBrand: unique symbol

export type ShareLinkId = string & { readonly [shareLinkIdBrand]: true }

export function toShareLinkId(value: string): ShareLinkId {
  return value as ShareLinkId
}

export type ShareLinkRecord = {
  createdAt: Date
  id: ShareLinkId
  itemId: ItemId
  ownerId: UserId
  revokedAt: Date | null
  tokenHash: string
}

export type ShareableItemSnapshot = {
  authoredTitle: string | null
  description: string | null
  extractedTitle: string | null
  faviconUrl: string | null
  id: ItemId
  imageUrl: string | null
  noteMarkdown: string | null
  originalUrl: string | null
  ownerId: UserId
  siteName: string | null
  status: ItemStatus
}

export type TokenMaterial = {
  token: string
  tokenHash: string
}

export interface ShareLinksRepository {
  createActive(record: ShareLinkRecord): Promise<ShareLinkRecord>
  findActiveByItem(
    ownerId: UserId,
    itemId: ItemId,
  ): Promise<ShareLinkRecord | null>
  findActiveByTokenHash(tokenHash: string): Promise<ShareLinkRecord | null>
  findShareableItem(
    ownerId: UserId,
    itemId: ItemId,
  ): Promise<ShareableItemSnapshot | null>
  findShareableItemById(itemId: ItemId): Promise<ShareableItemSnapshot | null>
  revokeActiveForItem(
    ownerId: UserId,
    itemId: ItemId,
    revokedAt: Date,
  ): Promise<boolean>
  revokeAllActiveForItem(itemId: ItemId, revokedAt: Date): Promise<number>
  rotateActive(
    ownerId: UserId,
    itemId: ItemId,
    next: ShareLinkRecord,
    revokedAt: Date,
  ): Promise<ShareLinkRecord | null>
}

export interface SharingModule {
  create: (actor: UserId, itemId: ItemId) => Promise<ShareLinkCreated>
  getStatus: (actor: UserId, itemId: ItemId) => Promise<ShareLinkStatus>
  resolvePublic: (token: string) => Promise<PublicSharedItem | null>
  revoke: (actor: UserId, itemId: ItemId) => Promise<void>
  revokeForLifecycle: (itemId: ItemId) => Promise<void>
  rotate: (actor: UserId, itemId: ItemId) => Promise<ShareLinkCreated>
}

export type SharingErrorCode =
  | 'INVALID_ITEM_STATE'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'

export class SharingError extends Error {
  readonly code: SharingErrorCode

  constructor(code: SharingErrorCode, message: string) {
    super(message)
    this.name = 'SharingError'
    this.code = code
  }
}
