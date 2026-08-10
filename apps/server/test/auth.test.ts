import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  closeDatabaseConnection,
  createDatabase,
  type DatabaseConnection,
} from '@cerebero/db'

import type { AppLogger } from '../src/infrastructure/logging/logger.js'
import { createAuthModule } from '../src/modules/auth/auth.js'

const socialSignInResponseSchema = z.object({
  redirect: z.boolean(),
  url: z.string().url(),
})

function createTestLogger(): AppLogger {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }
}

function createTestAuth(database: DatabaseConnection) {
  return createAuthModule({
    apiOrigin: 'http://localhost:3000',
    database,
    google: {
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
    },
    logger: createTestLogger(),
    oauthStateStorage: 'cookie',
    rateLimitStorage: 'memory',
    secret: 'test-auth-secret-that-is-at-least-32-characters',
    secureCookies: false,
    webOrigin: 'http://localhost:5173',
  })
}

describe('auth module', () => {
  let database: DatabaseConnection | undefined

  afterEach(async () => {
    if (database) {
      await closeDatabaseConnection(database)
      database = undefined
    }
  })

  it('starts Google OAuth without requiring email delivery', async () => {
    database = createDatabase('postgresql://localhost/cerebero_test')
    const auth = createTestAuth(database)

    const response = await auth.handler(
      new Request('http://localhost:3000/api/auth/sign-in/social', {
        body: JSON.stringify({
          callbackURL: '/library',
          disableRedirect: true,
          provider: 'google',
        }),
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:5173',
        },
        method: 'POST',
      }),
    )
    const body = socialSignInResponseSchema.parse(await response.json())
    const authorizationUrl = new URL(body.url)

    expect(response.status).toBe(200)
    expect(body.redirect).toBe(false)
    expect(authorizationUrl.hostname).toBe('accounts.google.com')
    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/auth/callback/google',
    )
  })

  it('keeps email sign-in disabled and derives account deletion from the session', async () => {
    database = createDatabase('postgresql://localhost/cerebero_test')
    const auth = createTestAuth(database)

    const emailResponse = await auth.handler(
      new Request('http://localhost:3000/api/auth/sign-in/email', {
        body: JSON.stringify({
          email: 'person@example.com',
          password: 'not-used-by-cerebero',
        }),
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:5173',
        },
        method: 'POST',
      }),
    )
    const deleteResponse = await auth.handler(
      new Request('http://localhost:3000/api/auth/delete-user', {
        body: JSON.stringify({ userId: 'another-user' }),
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:5173',
        },
        method: 'POST',
      }),
    )

    expect(emailResponse.ok).toBe(false)
    expect(deleteResponse.ok).toBe(false)
  })
})
