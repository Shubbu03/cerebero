import { describe, expect, it } from 'vitest'

import { getAuthCallbackUrl } from '../src/features/auth/auth-callback'
import {
  getAccountDeletionErrorMessage,
  getAuthErrorMessage,
} from '../src/features/auth/auth-error'

describe('Google-only auth policy', () => {
  it('builds library callback URLs', () => {
    expect(getAuthCallbackUrl('/library')).toBe(
      new URL('/library', window.location.origin).toString(),
    )
  })

  it('maps authentication failures without retaining email-auth guidance', () => {
    expect(
      getAuthErrorMessage(
        { status: 503 },
        'Google sign-in could not be completed.',
      ),
    ).toBe('Authentication is not configured on the backend yet.')
    expect(
      getAuthErrorMessage(
        { status: 403 },
        'Google sign-in could not be completed.',
      ),
    ).toBe('Google sign-in could not be completed.')
    expect(
      getAuthErrorMessage(
        'unexpected',
        'Google sign-in could not be completed.',
      ),
    ).toBe('Google sign-in could not be completed.')
  })

  it('explains the fresh-session requirement for account deletion', () => {
    expect(
      getAccountDeletionErrorMessage({ code: 'SESSION_EXPIRED', status: 400 }),
    ).toMatch(/sign out and sign in again/i)
  })
})
