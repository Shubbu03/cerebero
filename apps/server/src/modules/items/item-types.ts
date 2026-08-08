import type {
  CaptureItemInput,
  DuplicateCandidate,
  ItemCommand,
  ItemPage,
  ItemStatus,
  ItemView,
  ListItemsQuery,
  UpdateItemInput,
} from '@cerebero/contracts'

import type { TagSummary } from '../tags/tag-types.js'

declare const itemIdBrand: unique symbol
declare const userIdBrand: unique symbol

export type ItemId = string & { readonly [itemIdBrand]: true }
export type UserId = string & { readonly [userIdBrand]: true }

export function toItemId(value: string): ItemId {
  return value as ItemId
}

export function toUserId(value: string): UserId {
  return value as UserId
}

export type ItemRecord = {
  authoredTitle: string | null
  createdAt: Date
  id: ItemId
  normalizedUrl: string | null
  noteMarkdown: string | null
  originalUrl: string | null
  ownerId: UserId
  pinnedAt: Date | null
  status: ItemStatus
  tags: readonly TagSummary[]
  trashedAt: Date | null
  updatedAt: Date
  version: number
}

export type ItemListCursor = {
  createdAt: Date
  id: ItemId
}

export type ItemListOptions = {
  cursor: ItemListCursor | null
  kind: 'link' | 'note' | null
  limit: number
  pinned: boolean | null
  status: ItemStatus
  tagIds: readonly string[] | null
}

export type ItemRecordPatch = Partial<
  Pick<
    ItemRecord,
    | 'authoredTitle'
    | 'normalizedUrl'
    | 'noteMarkdown'
    | 'originalUrl'
    | 'pinnedAt'
    | 'status'
    | 'trashedAt'
    | 'updatedAt'
  >
>

export interface ItemRepository {
  createCapture(record: ItemRecord): Promise<ItemRecord>
  deletePermanently(
    ownerId: UserId,
    itemId: ItemId,
    expectedVersion: number,
  ): Promise<boolean>
  findById(ownerId: UserId, itemId: ItemId): Promise<ItemRecord | null>
  findDuplicates(
    ownerId: UserId,
    normalizedUrl: string,
    limit: number,
  ): Promise<readonly ItemRecord[]>
  list(
    ownerId: UserId,
    options: ItemListOptions,
  ): Promise<readonly ItemRecord[]>
  update(
    ownerId: UserId,
    itemId: ItemId,
    expectedVersion: number,
    patch: ItemRecordPatch,
  ): Promise<ItemRecord | null>
}

export type CaptureResult =
  | { outcome: 'created'; item: ItemView }
  | { candidates: DuplicateCandidate[]; outcome: 'duplicate' }

export interface ItemsModule {
  act: (
    actor: UserId,
    itemId: ItemId,
    command: ItemCommand,
  ) => Promise<ItemView>
  capture: (actor: UserId, input: CaptureItemInput) => Promise<CaptureResult>
  findDuplicateLinks: (
    actor: UserId,
    url: string,
  ) => Promise<DuplicateCandidate[]>
  get: (actor: UserId, itemId: ItemId) => Promise<ItemView | null>
  list: (actor: UserId, query: ListItemsQuery) => Promise<ItemPage>
  update: (
    actor: UserId,
    itemId: ItemId,
    patch: UpdateItemInput,
  ) => Promise<ItemView>
}

export type ItemsErrorCode =
  'EDIT_CONFLICT' | 'INVALID_ITEM_STATE' | 'INVALID_REQUEST' | 'NOT_FOUND'

export class ItemsError extends Error {
  readonly code: ItemsErrorCode

  constructor(code: ItemsErrorCode, message: string) {
    super(message)
    this.name = 'ItemsError'
    this.code = code
  }
}
