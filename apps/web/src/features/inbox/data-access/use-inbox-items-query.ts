import { itemPageSchema, type ItemPage } from '@cerebero/contracts'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'

import { apiClient } from '../../../lib/api-client'
import { inboxItemsQueryKey } from './inbox-items-query-key'

const INBOX_PAGE_SIZE = 25

async function fetchInboxItemsPage(cursor: string | null): Promise<ItemPage> {
  const response = await apiClient.get('/items', {
    params: {
      cursor: cursor ?? undefined,
      limit: INBOX_PAGE_SIZE,
      status: 'inbox',
    },
  })

  return itemPageSchema.parse(response.data)
}

export function useInboxItemsQuery() {
  return useInfiniteQuery<
    ItemPage,
    Error,
    InfiniteData<ItemPage>,
    typeof inboxItemsQueryKey,
    string | null
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchInboxItemsPage(pageParam),
    queryKey: inboxItemsQueryKey,
  })
}
