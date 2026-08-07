import { z } from 'zod'

export const MAX_TAG_NAME_LENGTH = 64
export const MAX_TAGS_PER_ITEM = 50

export const tagIdSchema = z.string().uuid()

export const tagViewSchema = z
  .object({
    createdAt: z.iso.datetime(),
    id: tagIdSchema,
    name: z.string().min(1).max(MAX_TAG_NAME_LENGTH),
  })
  .strict()

export const createTagInputSchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_TAG_NAME_LENGTH),
  })
  .strict()

export const renameTagInputSchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_TAG_NAME_LENGTH),
  })
  .strict()

export const tagListSchema = z
  .object({
    tags: z.array(tagViewSchema),
  })
  .strict()

export type CreateTagInput = z.infer<typeof createTagInputSchema>
export type RenameTagInput = z.infer<typeof renameTagInputSchema>
export type TagId = z.infer<typeof tagIdSchema>
export type TagList = z.infer<typeof tagListSchema>
export type TagView = z.infer<typeof tagViewSchema>
