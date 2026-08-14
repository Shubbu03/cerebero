import { z } from 'zod'

const environmentSchema = z.object({
  WXT_API_ORIGIN: z.url().default('http://localhost:3000'),
  WXT_EXTENSION_PUBLIC_KEY: z.string().trim().min(100).optional(),
  WXT_GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  WXT_WEB_ORIGIN: z.url().default('http://localhost:5173'),
})

const environment = environmentSchema.parse({
  WXT_API_ORIGIN: import.meta.env.WXT_API_ORIGIN || 'http://localhost:3000',
  WXT_EXTENSION_PUBLIC_KEY:
    import.meta.env.WXT_EXTENSION_PUBLIC_KEY || undefined,
  WXT_GOOGLE_CLIENT_ID: import.meta.env.WXT_GOOGLE_CLIENT_ID || undefined,
  WXT_WEB_ORIGIN: import.meta.env.WXT_WEB_ORIGIN || 'http://localhost:5173',
})

export const extensionEnvironment = {
  apiOrigin: new URL(environment.WXT_API_ORIGIN).origin,
  googleAuthenticationConfigured: Boolean(environment.WXT_GOOGLE_CLIENT_ID),
  webOrigin: new URL(environment.WXT_WEB_ORIGIN).origin,
}
