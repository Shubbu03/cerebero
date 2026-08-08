import { itemViewSchema, type ItemView } from '@cerebero/contracts'
import { useQuery } from '@tanstack/react-query'
import { isXiorError } from 'xior/utils'

import { apiClient } from '../../../lib/api-client'
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
  return useQuery({
    queryFn: () => readItem(itemId),
    queryKey: itemQueryKey(itemId),
    retry: (failureCount, error) =>
      error instanceof ItemQueryError && error.code !== 'not_found'
        ? failureCount < 1
        : false,
  })
}
