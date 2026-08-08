import {
  itemCommandSchema,
  itemIdSchema,
  itemViewSchema,
  type ItemPage,
  type ItemView,
} from '@cerebero/contracts'
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'

import { apiClient } from '../../../lib/api-client'
import { inboxItemsQueryKey } from '../../inbox/data-access/inbox-items-query-key'
import { itemQueryKey } from './item-query-key'

type FileItemInput = {
  itemId: string
  version: number
}

function removeItemFromInbox(
  current: InfiniteData<ItemPage> | undefined,
  itemId: string,
) {
  if (!current) {
    return current
  }

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== itemId),
    })),
  }
}

async function fileItem(input: FileItemInput): Promise<ItemView> {
  try {
    const itemId = itemIdSchema.parse(input.itemId)
    const command = itemCommandSchema.parse({
      expectedVersion: input.version,
      type: 'file',
    })
    const response = await apiClient.post(
      `/items/${encodeURIComponent(itemId)}/actions`,
      command,
    )
    const item = itemViewSchema.parse(response.data)
    if (item.status !== 'library') {
      throw new Error('The file action returned an unexpected Item state.')
    }

    return item
  } catch (error) {
    throw new Error('The Item could not be filed. Refresh and try again.', {
      cause: error,
    })
  }
}

export function useFileItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: fileItem,
    onSuccess: (item) => {
      queryClient.setQueryData(itemQueryKey(item.id), item)
      queryClient.setQueryData<InfiniteData<ItemPage>>(
        inboxItemsQueryKey,
        (current) => removeItemFromInbox(current, item.id),
      )
      void queryClient.invalidateQueries({
        queryKey: inboxItemsQueryKey,
        refetchType: 'active',
      })
    },
  })
}
