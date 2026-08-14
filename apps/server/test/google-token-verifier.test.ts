import { describe, expect, it, vi } from 'vitest'

import { createGoogleTokenVerifier } from '../src/modules/extension-auth/google-token-verifier.js'
import type { ExtensionAuthError } from '../src/modules/extension-auth/extension-auth-types.js'

const GOOGLE_TOKEN_INFO = {
  aud: 'chrome-client-id',
  email: 'person@example.com',
  email_verified: 'true',
  expires_in: '3599',
  scope: 'openid https://www.googleapis.com/auth/userinfo.email',
  sub: 'google-subject-1',
}

describe('Google Extension identity verification', () => {
  it('accepts a live token issued to the configured Chrome OAuth client', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(GOOGLE_TOKEN_INFO), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const verifier = createGoogleTokenVerifier({
      clientId: 'chrome-client-id',
      fetchImplementation,
    })

    await expect(verifier.verify('google-access-token')).resolves.toEqual({
      email: 'person@example.com',
      subject: 'google-subject-1',
    })

    const endpoint = fetchImplementation.mock.calls[0]?.[0]
    if (!endpoint) {
      throw new Error('Google token verification was not requested.')
    }
    const endpointUrl =
      endpoint instanceof URL
        ? endpoint
        : endpoint instanceof Request
          ? new URL(endpoint.url)
          : new URL(endpoint)
    expect(endpointUrl.origin).toBe('https://oauth2.googleapis.com')
    expect(endpointUrl.searchParams.get('access_token')).toBe(
      'google-access-token',
    )
  })

  it('rejects tokens for another OAuth client or without email scope', async () => {
    const wrongClient = createGoogleTokenVerifier({
      clientId: 'chrome-client-id',
      fetchImplementation: vi
        .fn()
        .mockResolvedValue(
          Response.json({ ...GOOGLE_TOKEN_INFO, aud: 'attacker-client-id' }),
        ),
    })
    const missingScope = createGoogleTokenVerifier({
      clientId: 'chrome-client-id',
      fetchImplementation: vi
        .fn()
        .mockResolvedValue(
          Response.json({ ...GOOGLE_TOKEN_INFO, scope: 'openid profile' }),
        ),
    })

    await expect(wrongClient.verify('token')).rejects.toMatchObject({
      code: 'GOOGLE_TOKEN_INVALID',
    })
    await expect(missingScope.verify('token')).rejects.toMatchObject({
      code: 'GOOGLE_TOKEN_INVALID',
    })
  })

  it('distinguishes invalid credentials from verifier outages', async () => {
    const invalid = createGoogleTokenVerifier({
      clientId: 'chrome-client-id',
      fetchImplementation: vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 401 })),
    })
    const unavailable = createGoogleTokenVerifier({
      clientId: 'chrome-client-id',
      fetchImplementation: vi.fn().mockRejectedValue(new Error('offline')),
    })

    await expect(invalid.verify('token')).rejects.toEqual(
      expect.objectContaining<Partial<ExtensionAuthError>>({
        code: 'GOOGLE_TOKEN_INVALID',
      }),
    )
    await expect(unavailable.verify('token')).rejects.toEqual(
      expect.objectContaining<Partial<ExtensionAuthError>>({
        code: 'GOOGLE_TOKEN_VERIFICATION_UNAVAILABLE',
      }),
    )
  })
})
