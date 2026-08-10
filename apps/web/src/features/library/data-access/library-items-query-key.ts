import type { ItemKind, ItemListSort } from '@cerebero/contracts'

export const libraryItemsQueryRoot = ['items', 'library'] as const
export const LIBRARY_PAGE_SIZE = 5
export const PINNED_LIBRARY_ITEM_LIMIT = 3

export type LibraryListFilters = {
  kind?: ItemKind | undefined
  pinned?: boolean | undefined
  sort: ItemListSort
  tag?: string[] | undefined
}

export function libraryItemsQueryKey(
  filters: LibraryListFilters,
  pageSize = LIBRARY_PAGE_SIZE,
) {
  return [
    ...libraryItemsQueryRoot,
    {
      kind: filters.kind ?? null,
      pageSize,
      pinned: filters.pinned ?? null,
      sort: filters.sort,
      tag: filters.tag ?? [],
    },
  ] as const
}

export const defaultLibraryListFilters: LibraryListFilters = {
  sort: 'created_desc',
}
