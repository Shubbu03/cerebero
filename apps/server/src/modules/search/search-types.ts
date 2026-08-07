import type { ItemPage, SearchQuery } from '@cerebero/contracts'

import type { ItemRecord, UserId } from '../items/item-types.js'

export type SearchCursor = {
  createdAt: Date
  id: string
  rank: number
}

export type SearchHit = {
  rank: number
  record: ItemRecord
}

export type SearchRepositoryOptions = {
  cursor: SearchCursor | null
  kind: 'link' | 'note' | null
  limit: number
  pinned: boolean | null
  query: string
  status: ItemRecord['status'] | null
  tagIds: readonly string[] | null
}

export interface SearchRepository {
  search(
    ownerId: UserId,
    options: SearchRepositoryOptions,
  ): Promise<readonly SearchHit[]>
}

export interface SearchModule {
  search: (actor: UserId, query: SearchQuery) => Promise<ItemPage>
}

export type SearchErrorCode = 'INVALID_REQUEST'

export class SearchError extends Error {
  readonly code: SearchErrorCode

  constructor(code: SearchErrorCode, message: string) {
    super(message)
    this.name = 'SearchError'
    this.code = code
  }
}
