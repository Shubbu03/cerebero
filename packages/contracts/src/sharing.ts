import { z } from 'zod'

import { itemKindSchema } from './items.js'

/** Public tokens are opaque base64url strings with high entropy. */
export const shareTokenSchema = z
  .string()
  .min(32)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/)

export const shareLinkViewSchema = z
  .object({
    createdAt: z.iso.datetime(),
    itemId: z.uuid(),
  })
  .strict()

/** Returned only from create/rotate — never persisted or re-fetched. */
export const shareLinkCreatedSchema = z
  .object({
    createdAt: z.iso.datetime(),
    itemId: z.uuid(),
    token: shareTokenSchema,
  })
  .strict()

export const shareLinkStatusSchema = z
  .object({
    active: z.boolean(),
    createdAt: z.iso.datetime().nullable(),
  })
  .strict()

/**
 * Deliberately limited public projection. No owner identity, tags, version,
 * lifecycle fields, or private ownership data.
 */
export const publicSharedItemSchema = z
  .object({
    authoredTitle: z.string().min(1).max(300).nullable(),
    displayTitle: z.string().min(1).max(300),
    kind: itemKindSchema,
    noteMarkdown: z.string().max(100_000).nullable(),
    originalUrl: z.url().max(2_048).nullable(),
  })
  .strict()

export type PublicSharedItem = z.infer<typeof publicSharedItemSchema>
export type ShareLinkCreated = z.infer<typeof shareLinkCreatedSchema>
export type ShareLinkStatus = z.infer<typeof shareLinkStatusSchema>
export type ShareLinkView = z.infer<typeof shareLinkViewSchema>
export type ShareToken = z.infer<typeof shareTokenSchema>
