import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import type { AuthenticatedSession } from '@cerebero/contracts'
import type { DatabaseConnection } from '@cerebero/db'
import * as authSchema from '@cerebero/db/schema'
import { betterAuth } from 'better-auth/minimal'

import type { AppLogger } from '../../infrastructure/logging/logger.js'
import type { AuthEmailDelivery } from './email-delivery.js'

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
  emailDelivery?: AuthEmailDelivery
  google?: GoogleProvider
  logger: AppLogger
  oauthStateStorage?: 'cookie' | 'database'
  rateLimitStorage?: 'database' | 'memory'
  secret: string
  secureCookies: boolean
  webOrigin: string
}

function scheduleEmail(
  send: () => Promise<void>,
  event: 'auth.email.password_reset_failed' | 'auth.email.verification_failed',
  logger: AppLogger,
): void {
  void send().catch(() => {
    logger.error(event)
  })
}

export function createAuthModule(options: AuthModuleOptions): AuthRuntime {
  const emailDelivery = options.emailDelivery
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
    ...(emailDelivery
      ? {
          emailAndPassword: {
            enabled: true,
            maxPasswordLength: 128,
            minPasswordLength: 12,
            requireEmailVerification: true,
            sendResetPassword: ({ user, url }) => {
              scheduleEmail(
                () =>
                  emailDelivery.sendPasswordResetEmail({
                    recipient: user.email,
                    url,
                  }),
                'auth.email.password_reset_failed',
                options.logger,
              )
              return Promise.resolve()
            },
          },
          emailVerification: {
            autoSignInAfterVerification: false,
            sendOnSignUp: true,
            sendVerificationEmail: ({ user, url }) => {
              scheduleEmail(
                () =>
                  emailDelivery.sendVerificationEmail({
                    recipient: user.email,
                    url,
                  }),
                'auth.email.verification_failed',
                options.logger,
              )
              return Promise.resolve()
            },
          },
        }
      : {}),
    rateLimit: {
      customRules: {
        '/request-password-reset': { max: 3, window: 60 },
        '/sign-in/email': { max: 5, window: 60 },
        '/sign-up/email': { max: 3, window: 60 },
      },
      enabled: true,
      max: 100,
      storage: options.rateLimitStorage ?? 'database',
      window: 60,
    },
    secret: options.secret,
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      freshAge: 60 * 5,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: [options.webOrigin],
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
