import type { ItemKind, ItemStatus } from '@cerebero/contracts'

export const searchQueryRoot = ['search'] as const

export type SearchFilters = {
  kind?: ItemKind | undefined
  pinned?: boolean | undefined
  q: string
  scope?: 'tags' | undefined
  status?: ItemStatus | undefined
  tag?: string[] | undefined
}

export function searchItemsQueryKey(filters: SearchFilters) {
  return [
    ...searchQueryRoot,
    {
      kind: filters.kind ?? null,
      pinned: filters.pinned ?? null,
      q: filters.q,
      scope: filters.scope ?? null,
      status: filters.status ?? null,
      tag: filters.tag ?? [],
    },
  ] as const
}
