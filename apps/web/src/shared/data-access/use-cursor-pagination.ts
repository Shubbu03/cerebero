import type { InfiniteData } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

type CursorPage<TItem> = {
  items: TItem[]
}

type FetchNextPageResult<TItem> = {
  data?: InfiniteData<CursorPage<TItem>> | undefined
}

type UseCursorPaginationOptions<TItem> = {
  fetchNextPage: () => Promise<FetchNextPageResult<TItem>>
  hasNextPage: boolean
  isFetchNextPageError: boolean
  isFetchingNextPage: boolean
  pageSize: number
  pages: CursorPage<TItem>[] | undefined
  resetKey: string
}

function createDisplayPages<TItem>(
  pages: CursorPage<TItem>[],
  pageSize: number,
): TItem[][] {
  const displayPages: TItem[][] = []

  for (const page of pages) {
    for (let index = 0; index < page.items.length; index += pageSize) {
      displayPages.push(page.items.slice(index, index + pageSize))
    }
  }

  return displayPages
}

export function useCursorPagination<TItem>({
  fetchNextPage,
  hasNextPage,
  isFetchNextPageError,
  isFetchingNextPage,
  pageSize,
  pages,
  resetKey,
}: UseCursorPaginationOptions<TItem>) {
  const [paginationState, setPaginationState] = useState({
    pageIndex: 0,
    resetKey,
  })
  const loadedPages = pages ?? []
  const displayPages = createDisplayPages(loadedPages, pageSize)
  const pageIndex =
    paginationState.resetKey === resetKey
      ? Math.min(
          paginationState.pageIndex,
          Math.max(0, displayPages.length - 1),
        )
      : 0
  const items = displayPages[pageIndex] ?? []
  const hasLoadedNextPage = pageIndex + 1 < displayPages.length

  const previousPage = useCallback(() => {
    setPaginationState({
      pageIndex: Math.max(0, pageIndex - 1),
      resetKey,
    })
  }, [pageIndex, resetKey])

  const nextPage = useCallback(async () => {
    if (isFetchingNextPage) return

    if (hasLoadedNextPage) {
      setPaginationState({ pageIndex: pageIndex + 1, resetKey })
      return
    }

    if (!hasNextPage) return

    const result = await fetchNextPage()

    const nextDisplayPageCount = result.data
      ? createDisplayPages(result.data.pages, pageSize).length
      : 0

    if (nextDisplayPageCount > pageIndex + 1) {
      setPaginationState({ pageIndex: pageIndex + 1, resetKey })
    }
  }, [
    fetchNextPage,
    hasLoadedNextPage,
    hasNextPage,
    isFetchingNextPage,
    pageIndex,
    pageSize,
    resetKey,
  ])

  return {
    canGoNext: hasLoadedNextPage || hasNextPage,
    canGoPrevious: pageIndex > 0,
    isNextPageError: isFetchNextPageError,
    isNextPageLoading: isFetchingNextPage,
    items,
    nextPage,
    pageNumber: pageIndex + 1,
    previousPage,
  }
}
