import {
  captureItemInputSchema,
  duplicateItemResponseSchema,
  itemViewSchema,
  type CaptureItemInput,
  type DuplicateCandidate,
  type ItemPage,
  type ItemView,
} from '@cerebero/contracts'
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { isXiorError } from 'xior/utils'

import { apiClient } from '../../../lib/api-client'
import { inboxItemsQueryKey } from '../../inbox/data-access/inbox-items-query-key'

export type CaptureItemMutationResult =
  | { item: ItemView; outcome: 'captured' }
  | { candidates: DuplicateCandidate[]; outcome: 'duplicate' }

async function captureItem(
  input: CaptureItemInput,
): Promise<CaptureItemMutationResult> {
  const parsedInput = captureItemInputSchema.parse(input)

  try {
    const response = await apiClient.post('/items', parsedInput)
    return { item: itemViewSchema.parse(response.data), outcome: 'captured' }
  } catch (error) {
    if (isXiorError(error) && error.response?.status === 409) {
      const duplicateResponse = duplicateItemResponseSchema.safeParse(
        error.response.data,
      )
      if (
        duplicateResponse.success &&
        duplicateResponse.data.error.code === 'DUPLICATE_ITEM'
      ) {
        return {
          candidates: duplicateResponse.data.candidates,
          outcome: 'duplicate',
        }
      }
    }

    throw new Error('Capture could not be completed. Try again.', {
      cause: error,
    })
  }
}

function addCapturedItemToInbox(
  current: InfiniteData<ItemPage> | undefined,
  item: ItemView,
) {
  if (
    !current ||
    current.pages.some((page) => page.items.some(({ id }) => id === item.id))
  ) {
    return current
  }

  const [firstPage, ...remainingPages] = current.pages
  if (!firstPage) {
    return current
  }

  return {
    ...current,
    pages: [
      { ...firstPage, items: [item, ...firstPage.items] },
      ...remainingPages,
    ],
  }
}

export function useCaptureItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: captureItem,
    onSuccess: (result) => {
      if (result.outcome === 'duplicate') {
        return
      }

      queryClient.setQueryData<InfiniteData<ItemPage>>(
        inboxItemsQueryKey,
        (current) => addCapturedItemToInbox(current, result.item),
      )
      void queryClient.invalidateQueries({
        queryKey: inboxItemsQueryKey,
        refetchType: 'active',
      })
    },
  })
}
