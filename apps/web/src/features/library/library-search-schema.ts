import { itemKindSchema, itemListSortSchema } from '@cerebero/contracts'
import { z } from 'zod'

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

export const librarySearchSchema = z.object({
  kind: itemKindSchema.optional(),
  pinned: z.enum(['true', 'false']).optional(),
  sort: itemListSortSchema.default('created_desc'),
  tag: z.preprocess(
    toOptionalStringArray,
    z.array(z.string().uuid()).max(10).optional(),
  ),
})

export type LibrarySearch = z.output<typeof librarySearchSchema>
