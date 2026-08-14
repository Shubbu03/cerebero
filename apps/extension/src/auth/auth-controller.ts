import type {
  AuthenticationErrorCode,
  AuthenticationState,
  ExtensionAuthenticationApi,
  ExtensionAuthenticationController,
  ExtensionAuthenticationStore,
  ExtensionIdentityProvider,
} from './auth-types'
import { GoogleIdentityError } from './google-identity-error'
import { ExtensionApiError } from '../lib/extension-api'

type AuthenticationControllerOptions = {
  api: ExtensionAuthenticationApi
  clock?: () => Date
  configured: boolean
  identity: ExtensionIdentityProvider
  store: ExtensionAuthenticationStore
}

function recoverableError(
  code: AuthenticationErrorCode,
  message: string,
): AuthenticationState {
  return { code, message, status: 'recoverable-error' }
}

function signInFailure(error: unknown): AuthenticationState {
  if (error instanceof ExtensionApiError) {
    if (error.code === 'FORBIDDEN') {
      return recoverableError(
        'wrong-account',
        'Use the same Google account that is connected to Cerebero.',
      )
    }
    if (error.code === 'network') {
      return recoverableError(
        'network',
        'Cerebero could not be reached. Check your connection and try again.',
      )
    }

    if (error.code === 'AUTH_UNAVAILABLE' || error.code === 'NOT_FOUND') {
      return recoverableError(
        'configuration',
        'The running Cerebero server does not have extension authentication enabled. Restart it after configuring GOOGLE_EXTENSION_CLIENT_ID.',
      )
    }

    if (error.code === 'UNAUTHENTICATED') {
      return recoverableError(
        'configuration',
        'Google issued a token for a different OAuth client. Verify the extension ID and Chrome client ID, then restart the server.',
      )
    }

    if (error.code === 'SERVICE_UNAVAILABLE') {
      return recoverableError(
        'network',
        'Google sign-in verification is temporarily unavailable. Try again shortly.',
      )
    }
  }

  if (error instanceof GoogleIdentityError) {
    switch (error.code) {
      case 'cancelled':
        return recoverableError('sign-in-cancelled', error.message)
      case 'configuration':
        return recoverableError(
          'configuration',
          'Chrome rejected this OAuth client. Make sure its Google Cloud Item ID matches the currently loaded extension ID.',
        )
      case 'unavailable':
        return recoverableError('unknown', error.message)
    }
  }

  return recoverableError(
    'unknown',
    'Sign-in could not be completed. Try again.',
  )
}

export function createAuthenticationController(
  options: AuthenticationControllerOptions,
): ExtensionAuthenticationController {
  const clock = options.clock ?? (() => new Date())
  let signInOperation: Promise<AuthenticationState> | null = null
  let transientState: AuthenticationState | null = null

  async function storedState(): Promise<AuthenticationState> {
    const record = await options.store.read()
    if (!record) {
      return transientState ?? { status: 'signed-out' }
    }

    if (
      record.status === 'expired' ||
      Date.parse(record.session.expiresAt) <= clock().getTime()
    ) {
      if (record.status === 'authenticated') {
        await options.store.writeExpired(record.session)
      }
      return { status: 'expired-session', user: record.session.user }
    }

    return { session: record.session, status: 'signed-in' }
  }

  async function performSignIn(): Promise<AuthenticationState> {
    if (!options.configured) {
      return recoverableError(
        'configuration',
        'Google sign-in is not configured for this build.',
      )
    }

    transientState = { status: 'authenticating' }
    let googleAccessToken: string | null = null
    try {
      googleAccessToken = await options.identity.getGoogleAccessToken()
      const authentication =
        await options.api.exchangeGoogleAccessToken(googleAccessToken)
      await options.store.writeAuthenticated({
        ...authentication,
        status: 'authenticated',
      })
      transientState = null
      return { session: authentication.session, status: 'signed-in' }
    } catch (error) {
      const state = signInFailure(error)
      transientState = state
      return state
    } finally {
      if (googleAccessToken) {
        try {
          await options.identity.forgetGoogleAccessToken(googleAccessToken)
        } catch {
          // Chrome's in-memory cache is best-effort cleanup. The token is
          // never written to extension storage regardless of this outcome.
        }
      }
    }
  }

  return {
    getState: async () =>
      signInOperation ? { status: 'authenticating' } : storedState(),

    signIn: async () => {
      if (signInOperation) {
        return signInOperation
      }

      const operation = performSignIn()
      signInOperation = operation
      try {
        return await operation
      } finally {
        if (signInOperation === operation) {
          signInOperation = null
        }
      }
    },

    signOut: async () => {
      const record = await options.store.read()
      if (!record) {
        transientState = null
        return { status: 'signed-out' }
      }

      if (record.status === 'authenticated') {
        try {
          await options.api.logout(record.token)
        } catch (error) {
          if (
            !(error instanceof ExtensionApiError) ||
            error.code === 'network'
          ) {
            const state = recoverableError(
              'network',
              'Sign-out could not reach Cerebero. Try again.',
            )
            transientState = state
            return state
          }
        }
      }

      await options.store.clear()
      transientState = null
      return { status: 'signed-out' }
    },
  }
}
