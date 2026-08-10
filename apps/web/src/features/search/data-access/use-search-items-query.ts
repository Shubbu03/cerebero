import { searchResponseSchema, type SearchResponse } from '@cerebero/contracts'
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'

import { apiClient } from '../../../lib/api-client'
import { searchItemsQueryKey, type SearchFilters } from './search-query-key'

const SEARCH_PAGE_SIZE = 25

async function querySearch(
  filters: SearchFilters,
  cursor: string | null,
  signal: AbortSignal,
): Promise<SearchResponse> {
  const response = await apiClient.get('/search', {
    params: {
      cursor: cursor ?? undefined,
      kind: filters.kind,
      limit: SEARCH_PAGE_SIZE,
      pinned:
        filters.pinned === undefined
          ? undefined
          : filters.pinned
            ? 'true'
            : 'false',
      q: filters.q,
      scope: filters.scope,
      status: filters.status,
      tag: filters.tag,
    },
    signal,
  })

  return searchResponseSchema.parse(response.data)
}

export function useSearchItemsQuery(filters: SearchFilters | null) {
  const queryKey = searchItemsQueryKey(filters ?? { q: '' })

  return useInfiniteQuery<
    SearchResponse,
    Error,
    InfiniteData<SearchResponse>,
    typeof queryKey,
    string | null
  >({
    enabled: Boolean(filters?.q),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => {
      if (!filters?.q) {
        throw new Error('A search query is required.')
      }
      return querySearch(filters, pageParam, signal)
    },
    queryKey,
  })
}
