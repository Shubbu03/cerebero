import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import type { AuthenticatedSession } from '@cerebero/contracts'
import type { DatabaseConnection } from '@cerebero/db'
import * as authSchema from '@cerebero/db/schema'
import { betterAuth } from 'better-auth/minimal'

import type { AppLogger } from '../../infrastructure/logging/logger.js'

export interface AuthRuntime {
  getSession(headers: Headers): Promise<AuthenticatedSession | null>
  handler(request: Request): Promise<Response>
}

type GoogleProvider = {
  clientId: string
  clientSecret: string
}

type AuthModuleOptions = {
  apiOrigin: string
  database: DatabaseConnection
  google?: GoogleProvider
  logger: AppLogger
  oauthStateStorage?: 'cookie' | 'database'
  rateLimitStorage?: 'database' | 'memory'
  secret: string
  secureCookies: boolean
  webOrigin: string
}

export function createAuthModule(options: AuthModuleOptions): AuthRuntime {
  const auth = betterAuth({
    account: {
      storeStateStrategy: options.oauthStateStorage ?? 'database',
    },
    advanced: {
      cookiePrefix: 'cerebero',
      useSecureCookies: options.secureCookies,
    },
    appName: 'Cerebero',
    basePath: '/api/auth',
    baseURL: options.apiOrigin,
    database: drizzleAdapter(options.database.database, {
      provider: 'pg',
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: false,
    },
    rateLimit: {
      enabled: true,
      max: 100,
      storage: options.rateLimitStorage ?? 'database',
      window: 60,
    },
    secret: options.secret,
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
        strategy: 'compact',
      },
      expiresIn: 60 * 60 * 24 * 7,
      freshAge: 60 * 5,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: [options.webOrigin],
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    ...(options.google
      ? {
          socialProviders: {
            google: options.google,
          },
        }
      : {}),
  })

  return {
    getSession: async (headers) => {
      const result = await auth.api.getSession({ headers })
      if (!result) {
        return null
      }

      return {
        session: {
          expiresAt: result.session.expiresAt.toISOString(),
          id: result.session.id,
          userId: result.session.userId,
        },
        user: {
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          id: result.user.id,
          image: result.user.image ?? null,
          name: result.user.name,
        },
      }
    },
    handler: (request) => auth.handler(request),
  }
}
