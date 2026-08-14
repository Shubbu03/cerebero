import { z } from 'zod'

import {
  ExtensionAuthError,
  type GoogleIdentityVerifier,
} from './extension-auth-types.js'

const GOOGLE_TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo'
const GOOGLE_TOKEN_VERIFICATION_TIMEOUT_MS = 5_000
const GOOGLE_EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email'

const googleTokenInfoSchema = z.object({
  aud: z.string().min(1).optional(),
  azp: z.string().min(1).optional(),
  email: z.email(),
  email_verified: z.union([z.literal('true'), z.literal(true)]),
  expires_in: z.coerce.number().int().positive(),
  scope: z.string().min(1),
  sub: z.string().min(1),
})

type GoogleTokenVerifierOptions = {
  clientId: string
  fetchImplementation?: typeof fetch
}

function invalidGoogleToken(): ExtensionAuthError {
  return new ExtensionAuthError(
    'GOOGLE_TOKEN_INVALID',
    'Google sign-in could not be verified.',
  )
}

function verificationUnavailable(): ExtensionAuthError {
  return new ExtensionAuthError(
    'GOOGLE_TOKEN_VERIFICATION_UNAVAILABLE',
    'Google sign-in verification is temporarily unavailable.',
  )
}

export function createGoogleTokenVerifier(
  options: GoogleTokenVerifierOptions,
): GoogleIdentityVerifier {
  const fetchImplementation = options.fetchImplementation ?? fetch

  return {
    verify: async (accessToken) => {
      const endpoint = new URL(GOOGLE_TOKEN_INFO_URL)
      endpoint.searchParams.set('access_token', accessToken)

      let response: Response
      try {
        response = await fetchImplementation(endpoint, {
          redirect: 'error',
          signal: AbortSignal.timeout(GOOGLE_TOKEN_VERIFICATION_TIMEOUT_MS),
        })
      } catch {
        throw verificationUnavailable()
      }

      if (response.status === 400 || response.status === 401) {
        throw invalidGoogleToken()
      }
      if (!response.ok) {
        throw verificationUnavailable()
      }

      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw verificationUnavailable()
      }

      const parsed = googleTokenInfoSchema.safeParse(payload)
      if (!parsed.success) {
        throw invalidGoogleToken()
      }

      const authorizedClient = parsed.data.azp ?? parsed.data.aud
      const scopes = new Set(parsed.data.scope.split(/\s+/).filter(Boolean))
      if (
        authorizedClient !== options.clientId ||
        !scopes.has(GOOGLE_EMAIL_SCOPE)
      ) {
        throw invalidGoogleToken()
      }

      return {
        email: parsed.data.email,
        subject: parsed.data.sub,
      }
    },
  }
}
