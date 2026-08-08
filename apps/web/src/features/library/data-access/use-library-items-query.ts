import { itemPageSchema, type ItemPage } from '@cerebero/contracts'
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'

import { apiClient } from '../../../lib/api-client'
import { libraryItemsQueryKey } from './library-items-query-key'

const LIBRARY_PAGE_SIZE = 25

async function queryLibraryItems(cursor: string | null): Promise<ItemPage> {
  const response = await apiClient.get('/items', {
    params: {
      cursor: cursor ?? undefined,
      limit: LIBRARY_PAGE_SIZE,
      status: 'library',
    },
  })

  return itemPageSchema.parse(response.data)
}

export function useLibraryItemsQuery() {
  return useInfiniteQuery<
    ItemPage,
    Error,
    InfiniteData<ItemPage>,
    typeof libraryItemsQueryKey,
    string | null
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null,
    queryFn: ({ pageParam }) => queryLibraryItems(pageParam),
    queryKey: libraryItemsQueryKey,
  })
}
