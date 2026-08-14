import { describe, expect, it } from 'vitest'

import { classifyGoogleIdentityError } from '../src/auth/google-identity-error'

describe('Chrome Google identity error classification', () => {
  it.each([
    'OAuth2 request failed: Service responded with error: bad client id',
    'Invalid OAuth client ID in manifest',
  ])('classifies OAuth client failures as configuration errors', (message) => {
    expect(classifyGoogleIdentityError(new Error(message))).toMatchObject({
      code: 'configuration',
    })
  })

  it.each(['The user did not approve access.', 'User cancelled the flow.'])(
    'classifies a closed account flow as cancellation',
    (message) => {
      expect(classifyGoogleIdentityError(new Error(message))).toMatchObject({
        code: 'cancelled',
      })
    },
  )

  it('does not expose an unknown Chrome error message', () => {
    const error = classifyGoogleIdentityError(
      new Error('secret internal Chrome state'),
    )

    expect(error).toMatchObject({ code: 'unavailable' })
    expect(error.message).toBe('Chrome could not complete Google sign-in.')
  })
})
