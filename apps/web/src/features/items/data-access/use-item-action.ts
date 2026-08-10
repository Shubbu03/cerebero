import {
  itemCommandSchema,
  itemViewSchema,
  type ItemCommand,
  type ItemView,
} from '@cerebero/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '../../../lib/api-client'
import {
  invalidateLibraryItemLists,
  removeItemFromAllItemLists,
  writeItemCaches,
} from './item-cache'
import { parseItemMutationError } from './parse-item-mutation-error'

async function runItemAction(
  itemId: string,
  command: ItemCommand,
): Promise<ItemView | null> {
  const parsedCommand = itemCommandSchema.parse(command)
  try {
    const response = await apiClient.post(
      `/items/${encodeURIComponent(itemId)}/actions`,
      parsedCommand,
    )
    if (response.status === 204 || response.data == null) {
      return null
    }
    return itemViewSchema.parse(response.data)
  } catch (error) {
    throw parseItemMutationError(error)
  }
}

export function useItemAction(itemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (command: ItemCommand) => runItemAction(itemId, command),
    onSuccess: (item) => {
      if (!item) {
        removeItemFromAllItemLists(queryClient, itemId)
        queryClient.removeQueries({ queryKey: ['items', 'detail', itemId] })
        invalidateLibraryItemLists(queryClient)
        return
      }

      writeItemCaches(queryClient, item)
      invalidateLibraryItemLists(queryClient)
    },
  })
}
