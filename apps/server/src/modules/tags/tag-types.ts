import type {
  CreateTagInput,
  RenameTagInput,
  TagList,
  TagView,
} from '@cerebero/contracts'

import type { ItemId, UserId } from '../items/item-types.js'

declare const tagIdBrand: unique symbol

export type TagId = string & { readonly [tagIdBrand]: true }

export function toTagId(value: string): TagId {
  return value as TagId
}

export type TagRecord = {
  createdAt: Date
  id: TagId
  name: string
  normalizedName: string
  ownerId: UserId
}

export type TagSummary = {
  createdAt: Date
  id: TagId
  name: string
}

export type OwnedResourceRef = {
  id: string
  ownerId: UserId
}

export interface TagRepository {
  attach(
    ownerId: UserId,
    itemId: ItemId,
    tagId: TagId,
    createdAt: Date,
  ): Promise<'attached' | 'already_attached' | null>
  countItemTags(ownerId: UserId, itemId: ItemId): Promise<number>
  create(record: TagRecord): Promise<TagRecord>
  delete(ownerId: UserId, tagId: TagId): Promise<boolean>
  findById(ownerId: UserId, tagId: TagId): Promise<TagRecord | null>
  findByNormalizedName(
    ownerId: UserId,
    normalizedName: string,
  ): Promise<TagRecord | null>
  findItemRef(ownerId: UserId, itemId: ItemId): Promise<OwnedResourceRef | null>
  list(ownerId: UserId): Promise<readonly TagRecord[]>
  listForItem(ownerId: UserId, itemId: ItemId): Promise<readonly TagSummary[]>
  listForItems(
    ownerId: UserId,
    itemIds: readonly ItemId[],
  ): Promise<ReadonlyMap<ItemId, readonly TagSummary[]>>
  rename(
    ownerId: UserId,
    tagId: TagId,
    name: string,
    normalizedName: string,
  ): Promise<TagRecord | null>
  detach(ownerId: UserId, itemId: ItemId, tagId: TagId): Promise<boolean>
}

export interface TagsModule {
  attach: (actor: UserId, itemId: ItemId, tagId: TagId) => Promise<TagView[]>
  create: (actor: UserId, input: CreateTagInput) => Promise<TagView>
  delete: (actor: UserId, tagId: TagId) => Promise<void>
  detach: (actor: UserId, itemId: ItemId, tagId: TagId) => Promise<TagView[]>
  get: (actor: UserId, tagId: TagId) => Promise<TagView | null>
  list: (actor: UserId) => Promise<TagList>
  rename: (
    actor: UserId,
    tagId: TagId,
    input: RenameTagInput,
  ) => Promise<TagView>
}

export type TagsErrorCode = 'DUPLICATE_TAG' | 'INVALID_REQUEST' | 'NOT_FOUND'

export class TagsError extends Error {
  readonly code: TagsErrorCode

  constructor(code: TagsErrorCode, message: string) {
    super(message)
    this.name = 'TagsError'
    this.code = code
  }
}
