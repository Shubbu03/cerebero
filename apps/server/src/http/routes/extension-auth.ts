import {
  extensionGoogleAuthInputSchema,
  type ExtensionGoogleAuthResponse,
} from '@cerebero/contracts'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { parseBearerToken } from '../authentication.js'
import type { AppEnvironment } from '../environment.js'
import { AppError } from '../errors.js'
import type { ExtensionAuthModule } from '../../modules/extension-auth/extension-auth-types.js'
import { ExtensionAuthError } from '../../modules/extension-auth/extension-auth-types.js'

const MAX_EXTENSION_AUTH_REQUEST_BYTES = 8 * 1_024

function toAppError(error: ExtensionAuthError): AppError {
  switch (error.code) {
    case 'ACCOUNT_NOT_CONNECTED':
      return new AppError({
        code: 'FORBIDDEN',
        message: error.message,
        status: 403,
      })
    case 'GOOGLE_TOKEN_INVALID':
      return new AppError({
        code: 'UNAUTHENTICATED',
        message: error.message,
        status: 401,
      })
    case 'GOOGLE_TOKEN_VERIFICATION_UNAVAILABLE':
      return new AppError({
        code: 'SERVICE_UNAVAILABLE',
        message: error.message,
        status: 503,
      })
  }
}

async function callExtensionAuth<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof ExtensionAuthError) {
      throw toAppError(error)
    }

    throw error
  }
}

const limitExtensionAuthBody = bodyLimit({
  maxSize: MAX_EXTENSION_AUTH_REQUEST_BYTES,
  onError: () => {
    throw new AppError({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The request body is too large.',
      status: 413,
    })
  },
})

export function createExtensionAuthRoutes(
  extensionAuth: ExtensionAuthModule,
): Hono<AppEnvironment> {
  const routes = new Hono<AppEnvironment>()

  routes.post('/auth/google', limitExtensionAuthBody, async (context) => {
    const mediaType = context.req
      .header('Content-Type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase()
    if (mediaType !== 'application/json') {
      throw new AppError({
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type must be application/json.',
        status: 415,
      })
    }

    let payload: unknown
    try {
      payload = await context.req.json()
    } catch {
      throw new AppError({
        code: 'INVALID_REQUEST',
        message: 'The JSON request body is invalid.',
        status: 400,
      })
    }

    const parsed = extensionGoogleAuthInputSchema.safeParse(payload)
    if (!parsed.success) {
      throw new AppError({
        code: 'INVALID_REQUEST',
        message: 'The extension authentication request is invalid.',
        status: 400,
      })
    }

    const response: ExtensionGoogleAuthResponse = await callExtensionAuth(() =>
      extensionAuth.exchangeGoogleAccessToken(parsed.data.accessToken),
    )
    context.header('Cache-Control', 'no-store')
    return context.json(response)
  })

  routes.post('/logout', async (context) => {
    const principal = context.get('authPrincipal')
    if (principal?.kind !== 'extension') {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'An Extension Session is required.',
        status: 403,
      })
    }

    const token = parseBearerToken(context.req.header('Authorization'))
    if (!token) {
      throw new AppError({
        code: 'UNAUTHENTICATED',
        message: 'Extension authentication is required.',
        status: 401,
      })
    }

    await extensionAuth.logout(token)
    context.header('Cache-Control', 'no-store')
    return context.body(null, 204)
  })

  return routes
}
