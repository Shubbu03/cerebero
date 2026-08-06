import { z } from 'zod'

import { apiErrorSchema } from './errors.js'
import { enrichmentViewSchema } from './enrichment.js'

export const MAX_ITEM_TITLE_LENGTH = 300
export const MAX_ITEM_NOTE_LENGTH = 100_000
export const MAX_ITEM_URL_LENGTH = 2_048
export const MAX_ITEM_PAGE_SIZE = 50

const nullableTrimmedString = (maximumLength: number) =>
  z.string().trim().max(maximumLength).nullable()

const nullablePreservedString = (maximumLength: number) =>
  z.string().max(maximumLength).nullable()

function isHttpUrl(value: string | null): boolean {
  if (!value) {
    return true
  }

  try {
    const url = new URL(value)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

const nullableHttpUrl = nullableTrimmedString(MAX_ITEM_URL_LENGTH).refine(
  isHttpUrl,
  'A valid HTTP or HTTPS URL without embedded credentials is required.',
)

export const itemIdSchema = z.string().uuid()
export const itemStatusSchema = z.enum([
  'inbox',
  'library',
  'archived',
  'trashed',
])
export const itemKindSchema = z.enum(['link', 'note'])

export const itemViewSchema = z
  .object({
    authoredTitle: z.string().min(1).max(MAX_ITEM_TITLE_LENGTH).nullable(),
    createdAt: z.string().datetime(),
    displayTitle: z.string().min(1).max(MAX_ITEM_TITLE_LENGTH),
    enrichment: enrichmentViewSchema.nullable(),
    id: itemIdSchema,
    kind: itemKindSchema,
    noteMarkdown: z.string().max(MAX_ITEM_NOTE_LENGTH).nullable(),
    originalUrl: z.string().url().max(MAX_ITEM_URL_LENGTH).nullable(),
    pinnedAt: z.string().datetime().nullable(),
    status: itemStatusSchema,
    updatedAt: z.string().datetime(),
    version: z.number().int().positive(),
  })
  .strict()

export const duplicateCandidateSchema = itemViewSchema.pick({
  authoredTitle: true,
  createdAt: true,
  displayTitle: true,
  id: true,
  kind: true,
  originalUrl: true,
  status: true,
  updatedAt: true,
})

export const captureItemInputSchema = z
  .object({
    allowDuplicate: z.boolean().optional().default(false),
    authoredTitle: nullableTrimmedString(MAX_ITEM_TITLE_LENGTH).optional(),
    noteMarkdown: nullablePreservedString(MAX_ITEM_NOTE_LENGTH).optional(),
    originalUrl: nullableHttpUrl.optional(),
  })
  .strict()
  .superRefine((input, context) => {
    const hasUrl = Boolean(input.originalUrl)
    const hasNote = Boolean(input.noteMarkdown?.trim())

    if (!hasUrl && !hasNote) {
      context.addIssue({
        code: 'custom',
        message: 'An Item requires a URL, a Markdown note, or both.',
        path: ['noteMarkdown'],
      })
    }
  })

export const updateItemInputSchema = z
  .object({
    authoredTitle: nullableTrimmedString(MAX_ITEM_TITLE_LENGTH).optional(),
    expectedVersion: z.number().int().positive(),
    noteMarkdown: nullablePreservedString(MAX_ITEM_NOTE_LENGTH).optional(),
    originalUrl: nullableHttpUrl.optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.authoredTitle === undefined &&
      input.noteMarkdown === undefined &&
      input.originalUrl === undefined
    ) {
      context.addIssue({
        code: 'custom',
        message: 'At least one editable field is required.',
      })
    }
  })

export const itemCommandTypeSchema = z.enum([
  'file',
  'move_to_inbox',
  'pin',
  'unpin',
])

export const itemCommandSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    type: itemCommandTypeSchema,
  })
  .strict()

export const duplicateCheckInputSchema = z
  .object({
    url: z
      .string()
      .trim()
      .min(1)
      .max(MAX_ITEM_URL_LENGTH)
      .refine(
        (value) => isHttpUrl(value),
        'A valid HTTP or HTTPS URL without embedded credentials is required.',
      ),
  })
  .strict()

export const duplicateCheckResponseSchema = z
  .object({
    candidates: z.array(duplicateCandidateSchema).max(10),
  })
  .strict()

export const duplicateItemResponseSchema = apiErrorSchema.extend({
  candidates: z.array(duplicateCandidateSchema).max(10),
})

export const listItemsQuerySchema = z
  .object({
    cursor: z.string().max(512).optional(),
    limit: z.coerce.number().int().min(1).max(MAX_ITEM_PAGE_SIZE).default(25),
    status: z.enum(['inbox', 'library']).default('inbox'),
  })
  .strict()

export const itemPageSchema = z
  .object({
    items: z.array(itemViewSchema),
    nextCursor: z.string().nullable(),
  })
  .strict()

export type CaptureItemInput = z.input<typeof captureItemInputSchema>
export type DuplicateCandidate = z.infer<typeof duplicateCandidateSchema>
export type DuplicateCheckInput = z.infer<typeof duplicateCheckInputSchema>
export type DuplicateCheckResponse = z.infer<
  typeof duplicateCheckResponseSchema
>
export type DuplicateItemResponse = z.infer<typeof duplicateItemResponseSchema>
export type ItemCommand = z.infer<typeof itemCommandSchema>
export type ItemCommandType = z.infer<typeof itemCommandTypeSchema>
export type ItemKind = z.infer<typeof itemKindSchema>
export type ItemPage = z.infer<typeof itemPageSchema>
export type ItemStatus = z.infer<typeof itemStatusSchema>
export type ItemView = z.infer<typeof itemViewSchema>
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>
export type UpdateItemInput = z.infer<typeof updateItemInputSchema>
