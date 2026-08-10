import {
  itemPageSchema,
  type ItemPage,
  type ItemStatus,
} from '@cerebero/contracts'
import {
  infiniteQueryOptions,
  keepPreviousData,
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query'

import { apiClient } from '../../../lib/api-client'

export const COLLECTION_PAGE_SIZE = 5

export function collectionItemsQueryKey(status: ItemStatus) {
  return [
    'items',
    'collection',
    status,
    { pageSize: COLLECTION_PAGE_SIZE },
  ] as const
}

async function queryCollection(
  status: ItemStatus,
  cursor: string | null,
): Promise<ItemPage> {
  const response = await apiClient.get('/items', {
    params: {
      cursor: cursor ?? undefined,
      limit: COLLECTION_PAGE_SIZE,
      sort: 'created_desc',
      status,
    },
  })
  return itemPageSchema.parse(response.data)
}

export function collectionItemsQueryOptions(status: 'archived' | 'trashed') {
  const queryKey = collectionItemsQueryKey(status)

  return infiniteQueryOptions<
    ItemPage,
    Error,
    InfiniteData<ItemPage>,
    typeof queryKey,
    string | null
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null,
    placeholderData: keepPreviousData,
    queryFn: ({ pageParam }) => queryCollection(status, pageParam),
    queryKey,
  })
}

export function useCollectionItemsQuery(status: 'archived' | 'trashed') {
  return useInfiniteQuery(collectionItemsQueryOptions(status))
}
