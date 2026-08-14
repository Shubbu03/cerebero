import { z } from 'zod'

import { publicUserSchema } from './auth.js'

export const MAX_GOOGLE_ACCESS_TOKEN_LENGTH = 4_096

export const extensionScopeSchema = z.enum([
  'items:create',
  'items:duplicates:check',
])

export const extensionGoogleAuthInputSchema = z.strictObject({
  accessToken: z.string().trim().min(20).max(MAX_GOOGLE_ACCESS_TOKEN_LENGTH),
})

export const extensionSessionSchema = z.object({
  expiresAt: z.iso.datetime(),
  id: z.uuid(),
  scopes: z.array(extensionScopeSchema).min(1),
  user: publicUserSchema,
})

export const extensionGoogleAuthResponseSchema = z.object({
  session: extensionSessionSchema,
  token: z.string().min(32).max(256),
})

export type ExtensionGoogleAuthInput = z.infer<
  typeof extensionGoogleAuthInputSchema
>
export type ExtensionGoogleAuthResponse = z.infer<
  typeof extensionGoogleAuthResponseSchema
>
export type ExtensionScope = z.infer<typeof extensionScopeSchema>
export type ExtensionSession = z.infer<typeof extensionSessionSchema>
