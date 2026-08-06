import { describe, expect, it } from 'vitest'

import { getAuthErrorMessage } from '../src/features/auth/auth-error'
import {
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
} from '../src/features/auth/auth-schemas'

describe('authentication input schemas', () => {
  it('normalizes email input before submission', () => {
    expect(
      loginSchema.parse({
        email: '  person@example.com ',
        password: 'correct horse battery staple',
      }).email,
    ).toBe('person@example.com')
  })

  it('rejects short or mismatched signup passwords', () => {
    const result = signupSchema.safeParse({
      confirmPassword: 'different-password',
      email: 'person@example.com',
      name: 'Person',
      password: 'short',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Use at least 12 characters.',
      )
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        'Passwords do not match.',
      )
    }
  })

  it('accepts a valid recovery email without revealing account existence', () => {
    expect(forgotPasswordSchema.parse({ email: 'person@example.com' })).toEqual(
      { email: 'person@example.com' },
    )
  })
})

describe('authentication error copy', () => {
  it('shows an honest backend configuration error', () => {
    expect(
      getAuthErrorMessage({ status: 503 }, 'Email or password is incorrect.'),
    ).toBe('Authentication is not configured on the backend yet.')
  })

  it('does not expose arbitrary backend messages', () => {
    expect(
      getAuthErrorMessage(
        { message: 'database host leaked', status: 500 },
        'Sign in could not be completed.',
      ),
    ).toBe('Sign in could not be completed.')
  })
})
