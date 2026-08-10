import { itemPageSchema, type ItemPage } from '@cerebero/contracts'
import {
  infiniteQueryOptions,
  keepPreviousData,
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query'

import { apiClient } from '../../../lib/api-client'
import {
  LIBRARY_PAGE_SIZE,
  PINNED_LIBRARY_ITEM_LIMIT,
  libraryItemsQueryKey,
  type LibraryListFilters,
} from './library-items-query-key'

async function queryLibraryItems(
  filters: LibraryListFilters,
  cursor: string | null,
  limit: number,
): Promise<ItemPage> {
  const response = await apiClient.get('/items', {
    params: {
      cursor: cursor ?? undefined,
      kind: filters.kind,
      limit,
      pinned:
        filters.pinned === undefined
          ? undefined
          : filters.pinned
            ? 'true'
            : 'false',
      sort: filters.sort,
      status: 'library',
      tag: filters.tag,
    },
  })

  return itemPageSchema.parse(response.data)
}

function libraryItemsQueryOptions(
  filters: LibraryListFilters,
  pageSize: number,
  paginate: boolean,
) {
  const queryKey = libraryItemsQueryKey(filters, pageSize)

  return infiniteQueryOptions<
    ItemPage,
    Error,
    InfiniteData<ItemPage>,
    typeof queryKey,
    string | null
  >({
    getNextPageParam: (lastPage) =>
      paginate ? (lastPage.nextCursor ?? undefined) : undefined,
    initialPageParam: null,
    placeholderData: keepPreviousData,
    queryFn: ({ pageParam }) => queryLibraryItems(filters, pageParam, pageSize),
    queryKey,
  })
}

export function paginatedLibraryItemsQueryOptions(filters: LibraryListFilters) {
  return libraryItemsQueryOptions(
    { ...filters, pinned: false },
    LIBRARY_PAGE_SIZE,
    true,
  )
}

export function pinnedLibraryItemsQueryOptions(filters: LibraryListFilters) {
  return libraryItemsQueryOptions(
    { ...filters, pinned: true },
    PINNED_LIBRARY_ITEM_LIMIT,
    false,
  )
}

export function useLibraryItemsQuery(filters: LibraryListFilters) {
  return useInfiniteQuery(paginatedLibraryItemsQueryOptions(filters))
}

export function usePinnedLibraryItemsQuery(filters: LibraryListFilters) {
  return useInfiniteQuery(pinnedLibraryItemsQueryOptions(filters))
}
