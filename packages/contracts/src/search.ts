import { z } from 'zod'

import {
  itemKindSchema,
  itemPageSchema,
  itemStatusSchema,
  MAX_ITEM_PAGE_SIZE,
} from './items.js'

export const MAX_SEARCH_QUERY_LENGTH = 200

function toOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      typeof entry === 'string' ? entry.split(',') : [],
    )
  }

  if (typeof value === 'string') {
    return value.split(',')
  }

  return undefined
}

export const searchQuerySchema = z
  .object({
    cursor: z.string().max(512).optional(),
    kind: itemKindSchema.optional(),
    limit: z.coerce.number().int().min(1).max(MAX_ITEM_PAGE_SIZE).default(25),
    pinned: z.enum(['true', 'false']).optional(),
    q: z.string().trim().min(1).max(MAX_SEARCH_QUERY_LENGTH),
    scope: z.literal('tags').optional(),
    status: itemStatusSchema.optional(),
    tag: z.preprocess(
      toOptionalStringArray,
      z.array(z.uuid()).max(10).optional(),
    ),
  })
  .strict()
  .transform((query) => ({
    ...query,
    pinned: query.pinned === undefined ? undefined : query.pinned === 'true',
  }))

export const searchResponseSchema = itemPageSchema

export type SearchQuery = {
  cursor?: string | undefined
  kind?: z.infer<typeof itemKindSchema> | undefined
  limit: number
  pinned?: boolean | undefined
  q: string
  scope?: 'tags' | undefined
  status?: z.infer<typeof itemStatusSchema> | undefined
  tag?: string[] | undefined
}
export type SearchResponse = z.infer<typeof searchResponseSchema>
