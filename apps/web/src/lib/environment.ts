import { z } from 'zod'

const browserEnvironmentSchema = z.object({
  VITE_API_ORIGIN: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().url().optional(),
  ),
})

const browserEnvironment = browserEnvironmentSchema.parse(import.meta.env)

export const apiOrigin = browserEnvironment.VITE_API_ORIGIN
  ? new URL(browserEnvironment.VITE_API_ORIGIN).origin
  : window.location.origin
