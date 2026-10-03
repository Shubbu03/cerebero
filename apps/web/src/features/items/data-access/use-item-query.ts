import {
  itemViewSchema,
  type ItemPage,
  type ItemView,
} from '@cerebero/contracts'
import {
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { isXiorError } from 'xior/utils'

import { apiClient } from '../../../lib/api-client'
import { libraryItemsQueryRoot } from '../../library/data-access/library-items-query-key'
import { searchQueryRoot } from '../../search/data-access/search-query-key'
import { ItemQueryError } from './item-query-error'
import { itemQueryKey } from './item-query-key'

async function readItem(itemId: string): Promise<ItemView> {
  try {
    const response = await apiClient.get(`/items/${encodeURIComponent(itemId)}`)
    return itemViewSchema.parse(response.data)
  } catch (error) {
    if (isXiorError(error) && error.response?.status === 404) {
      throw new ItemQueryError('not_found')
    }

    throw new ItemQueryError('unavailable')
  }
}

export function useItemQuery(itemId: string) {
  const queryClient = useQueryClient()

  const findCachedItem = () => {
    const listData = [
      ...queryClient.getQueriesData<InfiniteData<ItemPage>>({
        queryKey: libraryItemsQueryRoot,
      }),
      ...queryClient.getQueriesData<InfiniteData<ItemPage>>({
        queryKey: ['items', 'collection'],
      }),
      ...queryClient.getQueriesData<InfiniteData<ItemPage>>({
        queryKey: searchQueryRoot,
      }),
    ]

    for (const [, data] of listData) {
      const item = data?.pages
        .flatMap((page) => page.items)
        .find((candidate) => candidate.id === itemId)
      if (item) {
        return item
      }
    }

    return undefined
  }

  return useQuery({
    initialData: findCachedItem,
    queryFn: () => readItem(itemId),
    queryKey: itemQueryKey(itemId),
    retry: (failureCount, error) =>
      error instanceof ItemQueryError && error.code !== 'not_found'
        ? failureCount < 1
        : false,
    staleTime: 5 * 60_000,
  })
}
