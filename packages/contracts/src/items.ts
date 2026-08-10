import { z } from 'zod'

import { apiErrorSchema } from './errors.js'
import { tagViewSchema } from './tags.js'

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

export const itemIdSchema = z.uuid()
export const itemStatusSchema = z.enum(['library', 'archived', 'trashed'])
export const itemKindSchema = z.enum(['link', 'note'])
export const itemListSortSchema = z.enum([
  'created_desc',
  'created_asc',
  'updated_desc',
  'title_asc',
])

export const itemViewSchema = z
  .object({
    authoredTitle: z.string().min(1).max(MAX_ITEM_TITLE_LENGTH).nullable(),
    createdAt: z.iso.datetime(),
    displayTitle: z.string().min(1).max(MAX_ITEM_TITLE_LENGTH),
    id: itemIdSchema,
    kind: itemKindSchema,
    noteMarkdown: z.string().max(MAX_ITEM_NOTE_LENGTH).nullable(),
    originalUrl: z.url().max(MAX_ITEM_URL_LENGTH).nullable(),
    pinnedAt: z.iso.datetime().nullable(),
    status: itemStatusSchema,
    tags: z.array(tagViewSchema),
    trashedAt: z.iso.datetime().nullable(),
    updatedAt: z.iso.datetime(),
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
  'pin',
  'unpin',
  'archive',
  'trash',
  'restore',
  'delete_permanently',
])

export const itemCommandSchema = z
  .object({
    confirm: z.literal(true).optional(),
    expectedVersion: z.number().int().positive(),
    type: itemCommandTypeSchema,
  })
  .strict()
  .superRefine((command, context) => {
    if (command.type === 'delete_permanently' && command.confirm !== true) {
      context.addIssue({
        code: 'custom',
        message: 'Permanent deletion requires explicit confirmation.',
        path: ['confirm'],
      })
    }

    if (
      command.type !== 'delete_permanently' &&
      command.confirm !== undefined
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Confirmation is only valid for permanent deletion.',
        path: ['confirm'],
      })
    }
  })

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

export const listItemsQuerySchema = z
  .object({
    cursor: z.string().max(512).optional(),
    kind: itemKindSchema.optional(),
    limit: z.coerce.number().int().min(1).max(MAX_ITEM_PAGE_SIZE).default(25),
    pinned: z.enum(['true', 'false']).optional(),
    sort: itemListSortSchema.default('created_desc'),
    status: itemStatusSchema.default('library'),
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
export type ItemListSort = z.infer<typeof itemListSortSchema>
export type ItemPage = z.infer<typeof itemPageSchema>
export type ItemStatus = z.infer<typeof itemStatusSchema>
export type ItemView = z.infer<typeof itemViewSchema>
export type ListItemsQuery = {
  cursor?: string | undefined
  kind?: ItemKind | undefined
  limit: number
  pinned?: boolean | undefined
  sort: ItemListSort
  status: ItemStatus
  tag?: string[] | undefined
}
export type UpdateItemInput = z.infer<typeof updateItemInputSchema>
