import {
  apiErrorSchema,
  captureItemInputSchema,
  duplicateCheckResponseSchema,
  duplicateItemResponseSchema,
  extensionGoogleAuthResponseSchema,
  itemViewSchema,
  type ApiErrorCode,
} from '@cerebero/contracts'
import xior from 'xior'
import { isXiorError } from 'xior/utils'

import type { ExtensionAuthenticationApi } from '../auth/auth-types'
import type { ExtensionCaptureApi } from '../capture/capture-types'

export type ExtensionApiErrorCode = ApiErrorCode | 'network'

export class ExtensionApiError extends Error {
  readonly code: ExtensionApiErrorCode

  constructor(code: ExtensionApiErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'ExtensionApiError'
  }
}

export function createExtensionAuthenticationApi(
  apiOrigin: string,
): ExtensionAuthenticationApi {
  const client = xior.create({
    baseURL: new URL('/api/v1', apiOrigin).toString(),
    timeout: 10_000,
  })

  return {
    exchangeGoogleAccessToken: async (accessToken) => {
      try {
        const response = await client.post('/extension/auth/google', {
          accessToken,
        })
        return extensionGoogleAuthResponseSchema.parse(response.data)
      } catch (error) {
        throw parseExtensionApiError(error)
      }
    },

    logout: async (token) => {
      try {
        await client.post('/extension/logout', undefined, {
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (error) {
        throw parseExtensionApiError(error)
      }
    },
  }
}

export function createExtensionCaptureApi(
  apiOrigin: string,
): ExtensionCaptureApi {
  const client = xior.create({
    baseURL: new URL('/api/v1', apiOrigin).toString(),
    timeout: 10_000,
  })

  const authorization = (token: string) => ({
    headers: { Authorization: `Bearer ${token}` },
  })

  return {
    checkDuplicates: async (token, url) => {
      try {
        const response = await client.post(
          '/items/duplicates/check',
          { url },
          authorization(token),
        )
        return duplicateCheckResponseSchema.parse(response.data).candidates
      } catch (error) {
        throw parseExtensionApiError(error)
      }
    },

    capture: async (token, rawInput) => {
      const input = captureItemInputSchema.parse(rawInput)
      try {
        const response = await client.post(
          '/items',
          input,
          authorization(token),
        )
        return {
          item: itemViewSchema.parse(response.data),
          outcome: 'captured',
        }
      } catch (error) {
        if (isXiorError(error) && error.response?.status === 409) {
          const duplicate = duplicateItemResponseSchema.safeParse(
            error.response.data,
          )
          if (
            duplicate.success &&
            duplicate.data.error.code === 'DUPLICATE_ITEM'
          ) {
            return {
              candidates: duplicate.data.candidates,
              outcome: 'duplicate',
            }
          }
        }
        throw parseExtensionApiError(error)
      }
    },
  }
}

export function parseExtensionApiError(error: unknown): ExtensionApiError {
  if (!isXiorError(error) || !error.response) {
    return new ExtensionApiError('network', 'Cerebero could not be reached.')
  }

  const parsed = apiErrorSchema.safeParse(error.response.data)
  if (!parsed.success) {
    return new ExtensionApiError(
      'network',
      'Cerebero returned an invalid response.',
    )
  }

  return new ExtensionApiError(
    parsed.data.error.code,
    parsed.data.error.message,
  )
}
