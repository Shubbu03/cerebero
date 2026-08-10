import {
  itemViewSchema,
  updateItemInputSchema,
  type ItemView,
  type UpdateItemInput,
} from '@cerebero/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '../../../lib/api-client'
import { invalidateLibraryItemLists, writeItemCaches } from './item-cache'
import { parseItemMutationError } from './parse-item-mutation-error'

async function updateItem(
  itemId: string,
  input: UpdateItemInput,
): Promise<ItemView> {
  const parsedInput = updateItemInputSchema.parse(input)
  try {
    const response = await apiClient.patch(
      `/items/${encodeURIComponent(itemId)}`,
      parsedInput,
    )
    return itemViewSchema.parse(response.data)
  } catch (error) {
    throw parseItemMutationError(error)
  }
}

export function useUpdateItem(itemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateItemInput) => updateItem(itemId, input),
    onSuccess: (item) => {
      writeItemCaches(queryClient, item)
      invalidateLibraryItemLists(queryClient)
    },
  })
}
