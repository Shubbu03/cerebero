import { describe, expect, it } from 'vitest'

import {
  extensionGoogleAuthInputSchema,
  extensionGoogleAuthResponseSchema,
} from '../src/index.js'

describe('extension authentication contracts', () => {
  it('accepts the bounded Google token exchange request', () => {
    expect(
      extensionGoogleAuthInputSchema.parse({ accessToken: 'a'.repeat(40) }),
    ).toEqual({ accessToken: 'a'.repeat(40) })
  })

  it('rejects unknown exchange fields and short tokens', () => {
    expect(
      extensionGoogleAuthInputSchema.safeParse({
        accessToken: 'short',
        ownerId: 'attacker-selected-user',
      }).success,
    ).toBe(false)
  })

  it('exposes only the extension token, scoped session, and public user', () => {
    const response = {
      session: {
        expiresAt: '2026-09-13T00:00:00.000Z',
        id: '00000000-0000-4000-8000-000000000001',
        scopes: ['items:create', 'items:duplicates:check'],
        user: {
          email: 'person@example.com',
          emailVerified: true,
          id: 'user-1',
          image: null,
          name: 'Person',
        },
      },
      token: `cer_ext_${'a'.repeat(43)}`,
    }

    expect(extensionGoogleAuthResponseSchema.parse(response)).toEqual(response)
  })
})
