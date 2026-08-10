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
  type QueryKey,
} from '@tanstack/react-query'
import { isXiorError } from 'xior/utils'

import { apiClient } from '../../../lib/api-client'
import { libraryItemsQueryRoot } from '../../library/data-access/library-items-query-key'

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

function addCapturedItemToLibrary(
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

function removeCapturedItemFromLibrary(
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

function replaceCapturedItemInLibrary(
  current: InfiniteData<ItemPage> | undefined,
  optimisticId: string,
  item: ItemView,
) {
  return addCapturedItemToLibrary(
    removeCapturedItemFromLibrary(current, optimisticId),
    item,
  )
}

function optimisticDisplayTitle(input: CaptureItemInput): string {
  const authoredTitle = input.authoredTitle?.trim()
  if (authoredTitle) {
    return authoredTitle
  }

  const firstNoteLine = input.noteMarkdown
    ?.split('\n')
    .map((line) => line.trim())
    .find(Boolean)
  if (firstNoteLine) {
    return firstNoteLine.slice(0, 300)
  }

  if (input.originalUrl) {
    try {
      return new URL(input.originalUrl).hostname
    } catch {
      // Runtime validation still owns malformed URL errors.
    }
  }

  return 'Saving Item…'
}

function createOptimisticItem(input: CaptureItemInput): ItemView & {
  clientState: 'saving'
} {
  const timestamp = new Date().toISOString()
  return {
    authoredTitle: input.authoredTitle ?? null,
    clientState: 'saving',
    createdAt: timestamp,
    displayTitle: optimisticDisplayTitle(input),
    id: crypto.randomUUID(),
    kind: input.originalUrl ? 'link' : 'note',
    noteMarkdown: input.noteMarkdown ?? null,
    originalUrl: input.originalUrl ?? null,
    pinnedAt: null,
    status: 'library',
    tags: [],
    trashedAt: null,
    updatedAt: timestamp,
    version: 1,
  }
}

function optimisticLibraryQueryKeys(
  queryClient: ReturnType<typeof useQueryClient>,
  item: ItemView,
): QueryKey[] {
  const queryKeys: QueryKey[] = []

  for (const [queryKey, current] of queryClient.getQueriesData<
    InfiniteData<ItemPage>
  >({ queryKey: libraryItemsQueryRoot })) {
    const filters = queryKey[2]
    if (
      !current ||
      typeof filters !== 'object' ||
      filters === null ||
      !('sort' in filters)
    ) {
      continue
    }

    const typedFilters = filters as {
      kind: 'link' | 'note' | null
      pinned: boolean | null
      sort: string
      tag: string[]
    }
    const matches =
      (typedFilters.kind === null || typedFilters.kind === item.kind) &&
      (typedFilters.pinned === null || typedFilters.pinned === false) &&
      typedFilters.tag.length === 0 &&
      (typedFilters.sort === 'created_desc' ||
        typedFilters.sort === 'updated_desc')

    if (matches) {
      queryKeys.push(queryKey)
    }
  }

  return queryKeys
}

export function useCaptureItem() {
  const queryClient = useQueryClient()

  return useMutation<
    CaptureItemMutationResult,
    Error,
    CaptureItemInput,
    { optimisticId: string; queryKeys: QueryKey[] }
  >({
    mutationFn: captureItem,
    onError: (_error, _input, context) => {
      if (!context) {
        return
      }

      for (const queryKey of context.queryKeys) {
        queryClient.setQueryData<InfiniteData<ItemPage>>(queryKey, (current) =>
          removeCapturedItemFromLibrary(current, context.optimisticId),
        )
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: libraryItemsQueryRoot })
      const optimisticItem = createOptimisticItem(input)
      const queryKeys = optimisticLibraryQueryKeys(queryClient, optimisticItem)
      for (const queryKey of queryKeys) {
        queryClient.setQueryData<InfiniteData<ItemPage>>(queryKey, (current) =>
          addCapturedItemToLibrary(current, optimisticItem),
        )
      }
      return { optimisticId: optimisticItem.id, queryKeys }
    },
    onSuccess: (result, _input, context) => {
      if (!context) {
        return
      }

      if (result.outcome === 'duplicate') {
        for (const queryKey of context.queryKeys) {
          queryClient.setQueryData<InfiniteData<ItemPage>>(
            queryKey,
            (current) =>
              removeCapturedItemFromLibrary(current, context.optimisticId),
          )
        }
        return
      }

      for (const queryKey of context.queryKeys) {
        queryClient.setQueryData<InfiniteData<ItemPage>>(queryKey, (current) =>
          replaceCapturedItemInLibrary(
            current,
            context.optimisticId,
            result.item,
          ),
        )
      }

      void queryClient.invalidateQueries({
        queryKey: libraryItemsQueryRoot,
      })
    },
  })
}
