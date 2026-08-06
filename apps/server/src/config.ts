import { z } from 'zod'

const environmentSchema = z
  .object({
    APP_ORIGIN: z.string().url(),
    API_ORIGIN: z.string().url().default('http://localhost:3000'),
    AUTH_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(32).optional(),
    ),
    DATABASE_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().url().optional(),
    ),
    GOOGLE_CLIENT_ID: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional(),
    ),
    GOOGLE_CLIENT_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional(),
    ),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3_000),
  })
  .superRefine((environment, context) => {
    if (
      Boolean(environment.GOOGLE_CLIENT_ID) !==
      Boolean(environment.GOOGLE_CLIENT_SECRET)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Google OAuth credentials must be configured together.',
        path: ['GOOGLE_CLIENT_ID'],
      })
    }
  })

export type Environment = z.infer<typeof environmentSchema>

export function parseEnvironment(environment: NodeJS.ProcessEnv): Environment {
  return environmentSchema.parse(environment)
}
