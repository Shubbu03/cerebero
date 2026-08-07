import { z } from 'zod'

export const publicUserSchema = z.object({
  email: z.email(),
  emailVerified: z.boolean(),
  id: z.string().min(1),
  image: z.url().nullable(),
  name: z.string().min(1),
})

export const publicSessionSchema = z.object({
  expiresAt: z.iso.datetime(),
  id: z.string().min(1),
  userId: z.string().min(1),
})

export const authenticatedSessionSchema = z.object({
  session: publicSessionSchema,
  user: publicUserSchema,
})

export type PublicUser = z.infer<typeof publicUserSchema>
export type PublicSession = z.infer<typeof publicSessionSchema>
export type AuthenticatedSession = z.infer<typeof authenticatedSessionSchema>
