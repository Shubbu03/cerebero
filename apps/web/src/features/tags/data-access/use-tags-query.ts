import { tagListSchema, type TagList } from '@cerebero/contracts'
import { useQuery } from '@tanstack/react-query'

import { apiClient } from '../../../lib/api-client'
import { tagsQueryKey } from './tags-query-key'

async function readTags(): Promise<TagList> {
  const response = await apiClient.get('/tags')
  return tagListSchema.parse(response.data)
}

export function useTagsQuery() {
  return useQuery({
    queryFn: readTags,
    queryKey: tagsQueryKey,
    staleTime: 10 * 60_000,
  })
}
