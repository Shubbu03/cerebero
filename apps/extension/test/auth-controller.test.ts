import type { ExtensionSession } from '@cerebero/contracts'
import { describe, expect, it, vi } from 'vitest'

import { createAuthenticationController } from '../src/auth/auth-controller'
import type {
  ExtensionAuthenticationStore,
  StoredExtensionAuthentication,
} from '../src/auth/auth-types'
import { GoogleIdentityError } from '../src/auth/google-identity-error'
import { ExtensionApiError } from '../src/lib/extension-api'

const SESSION: ExtensionSession = {
  expiresAt: '2026-09-13T12:00:00.000Z',
  id: '00000000-0000-4000-8000-000000000401',
  scopes: ['items:create', 'items:duplicates:check'],
  user: {
    email: 'person@example.com',
    emailVerified: true,
    id: 'user-1',
    image: null,
    name: 'Person',
  },
}

function createStore(initial: StoredExtensionAuthentication | null = null) {
  let value = initial
  const clear = vi.fn(() => {
    value = null
    return Promise.resolve()
  })
  const read = vi.fn(() => Promise.resolve(value))
  const writeAuthenticated = vi.fn(
    (
      record: Extract<
        StoredExtensionAuthentication,
        { status: 'authenticated' }
      >,
    ) => {
      value = record
      return Promise.resolve()
    },
  )
  const writeExpired = vi.fn((session: ExtensionSession) => {
    value = { session, status: 'expired' }
    return Promise.resolve()
  })
  const store: ExtensionAuthenticationStore = {
    clear,
    read,
    writeAuthenticated,
    writeExpired,
  }
  return {
    clear,
    read,
    store,
    value: () => value,
    writeAuthenticated,
    writeExpired,
  }
}

describe('Extension authentication controller', () => {
  it('does not start interactive Google authentication while reading signed-out state', async () => {
    const getGoogleAccessToken = vi.fn().mockResolvedValue('google-token')
    const controller = createAuthenticationController({
      api: {
        exchangeGoogleAccessToken: vi.fn(),
        logout: vi.fn(),
      },
      configured: true,
      identity: {
        forgetGoogleAccessToken: vi.fn(),
        getGoogleAccessToken,
      },
      store: createStore().store,
    })

    await expect(controller.getState()).resolves.toEqual({
      status: 'signed-out',
    })
    expect(getGoogleAccessToken).not.toHaveBeenCalled()
  })

  it('exchanges Google identity once and persists only the Cerebero session', async () => {
    const store = createStore()
    const forgetGoogleAccessToken = vi.fn().mockResolvedValue(undefined)
    const exchangeGoogleAccessToken = vi.fn().mockResolvedValue({
      session: SESSION,
      token: 'cer_ext_server_session_token',
    })
    const controller = createAuthenticationController({
      api: { exchangeGoogleAccessToken, logout: vi.fn() },
      clock: () => new Date('2026-08-13T12:00:00.000Z'),
      configured: true,
      identity: {
        forgetGoogleAccessToken,
        getGoogleAccessToken: vi.fn().mockResolvedValue('google-access-token'),
      },
      store: store.store,
    })

    await expect(controller.signIn()).resolves.toEqual({
      session: SESSION,
      status: 'signed-in',
    })
    expect(exchangeGoogleAccessToken).toHaveBeenCalledWith(
      'google-access-token',
    )
    expect(forgetGoogleAccessToken).toHaveBeenCalledWith('google-access-token')
    expect(store.value()).toEqual({
      session: SESSION,
      status: 'authenticated',
      token: 'cer_ext_server_session_token',
    })
    expect(JSON.stringify(store.value())).not.toContain('google-access-token')
  })

  it('reports a wrong account without storing a session', async () => {
    const store = createStore()
    const controller = createAuthenticationController({
      api: {
        exchangeGoogleAccessToken: vi
          .fn()
          .mockRejectedValue(
            new ExtensionApiError('FORBIDDEN', 'Account not connected.'),
          ),
        logout: vi.fn(),
      },
      configured: true,
      identity: {
        forgetGoogleAccessToken: vi.fn().mockResolvedValue(undefined),
        getGoogleAccessToken: vi.fn().mockResolvedValue('wrong-google-token'),
      },
      store: store.store,
    })

    await expect(controller.signIn()).resolves.toMatchObject({
      code: 'wrong-account',
      status: 'recoverable-error',
    })
    expect(store.writeAuthenticated).not.toHaveBeenCalled()
  })

  it('reports a Chrome OAuth client mismatch instead of a generic failure', async () => {
    const controller = createAuthenticationController({
      api: { exchangeGoogleAccessToken: vi.fn(), logout: vi.fn() },
      configured: true,
      identity: {
        forgetGoogleAccessToken: vi.fn(),
        getGoogleAccessToken: vi
          .fn()
          .mockRejectedValue(
            new GoogleIdentityError(
              'configuration',
              'OAuth2 request failed: bad client id',
            ),
          ),
      },
      store: createStore().store,
    })

    await expect(controller.signIn()).resolves.toEqual({
      code: 'configuration',
      message:
        'Chrome rejected this OAuth client. Make sure its Google Cloud Item ID matches the currently loaded extension ID.',
      status: 'recoverable-error',
    })
  })

  it.each(['AUTH_UNAVAILABLE', 'NOT_FOUND'] as const)(
    'reports backend extension auth configuration for %s',
    async (code) => {
      const controller = createAuthenticationController({
        api: {
          exchangeGoogleAccessToken: vi
            .fn()
            .mockRejectedValue(new ExtensionApiError(code, 'Unavailable.')),
          logout: vi.fn(),
        },
        configured: true,
        identity: {
          forgetGoogleAccessToken: vi.fn().mockResolvedValue(undefined),
          getGoogleAccessToken: vi.fn().mockResolvedValue('google-token'),
        },
        store: createStore().store,
      })

      await expect(controller.signIn()).resolves.toEqual({
        code: 'configuration',
        message:
          'The running Cerebero server does not have extension authentication enabled. Restart it after configuring GOOGLE_EXTENSION_CLIENT_ID.',
        status: 'recoverable-error',
      })
    },
  )

  it('reports a Google token audience mismatch from the backend', async () => {
    const controller = createAuthenticationController({
      api: {
        exchangeGoogleAccessToken: vi
          .fn()
          .mockRejectedValue(
            new ExtensionApiError('UNAUTHENTICATED', 'Invalid token.'),
          ),
        logout: vi.fn(),
      },
      configured: true,
      identity: {
        forgetGoogleAccessToken: vi.fn().mockResolvedValue(undefined),
        getGoogleAccessToken: vi.fn().mockResolvedValue('google-token'),
      },
      store: createStore().store,
    })

    await expect(controller.signIn()).resolves.toEqual({
      code: 'configuration',
      message:
        'Google issued a token for a different OAuth client. Verify the extension ID and Chrome client ID, then restart the server.',
      status: 'recoverable-error',
    })
  })

  it('removes the bearer token while retaining an expired-session state', async () => {
    const store = createStore({
      session: { ...SESSION, expiresAt: '2026-08-13T11:59:59.000Z' },
      status: 'authenticated',
      token: 'cer_ext_expired_token',
    })
    const controller = createAuthenticationController({
      api: { exchangeGoogleAccessToken: vi.fn(), logout: vi.fn() },
      clock: () => new Date('2026-08-13T12:00:00.000Z'),
      configured: true,
      identity: {
        forgetGoogleAccessToken: vi.fn(),
        getGoogleAccessToken: vi.fn(),
      },
      store: store.store,
    })

    await expect(controller.getState()).resolves.toMatchObject({
      status: 'expired-session',
      user: SESSION.user,
    })
    expect(store.writeExpired).toHaveBeenCalledOnce()
    expect(store.value()).toEqual({
      session: { ...SESSION, expiresAt: '2026-08-13T11:59:59.000Z' },
      status: 'expired',
    })
  })

  it('revokes the server session before clearing local authentication', async () => {
    const store = createStore({
      session: SESSION,
      status: 'authenticated',
      token: 'cer_ext_server_session_token',
    })
    const logout = vi.fn().mockResolvedValue(undefined)
    const controller = createAuthenticationController({
      api: { exchangeGoogleAccessToken: vi.fn(), logout },
      configured: true,
      identity: {
        forgetGoogleAccessToken: vi.fn(),
        getGoogleAccessToken: vi.fn(),
      },
      store: store.store,
    })

    await expect(controller.signOut()).resolves.toEqual({
      status: 'signed-out',
    })
    expect(logout).toHaveBeenCalledWith('cer_ext_server_session_token')
    expect(store.clear).toHaveBeenCalledOnce()
  })

  it('deduplicates repeated sign-in requests', async () => {
    let finishIdentity: ((token: string) => void) | undefined
    const getGoogleAccessToken = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finishIdentity = resolve
        }),
    )
    const controller = createAuthenticationController({
      api: {
        exchangeGoogleAccessToken: vi.fn().mockResolvedValue({
          session: SESSION,
          token: 'cer_ext_server_session_token',
        }),
        logout: vi.fn(),
      },
      configured: true,
      identity: {
        forgetGoogleAccessToken: vi.fn().mockResolvedValue(undefined),
        getGoogleAccessToken,
      },
      store: createStore().store,
    })

    const first = controller.signIn()
    const second = controller.signIn()
    finishIdentity?.('google-access-token')

    await Promise.all([first, second])
    expect(getGoogleAccessToken).toHaveBeenCalledOnce()
  })
})
