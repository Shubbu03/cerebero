import { describe, expect, it } from 'vitest'

import { apiErrorSchema } from '../src/index.js'

describe('apiErrorSchema', () => {
  it('accepts the stable safe error envelope', () => {
    expect(
      apiErrorSchema.parse({
        error: {
          code: 'INVALID_REQUEST',
          message: 'The request is invalid.',
          requestId: 'request-1',
        },
      }),
    ).toEqual({
      error: {
        code: 'INVALID_REQUEST',
        message: 'The request is invalid.',
        requestId: 'request-1',
      },
    })
  })

  it('includes stable authentication boundary codes', () => {
    expect(
      apiErrorSchema.parse({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Sign in is required.',
          requestId: 'request-2',
        },
      }).error.code,
    ).toBe('UNAUTHENTICATED')
  })
})
