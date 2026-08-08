import type { ReactNode } from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAuthCallbackUrl } from '../src/features/auth/auth-callback'
import { LoginRoute } from '../src/features/auth/auth-routes'

const { socialSignIn } = vi.hoisted(() => ({
  socialSignIn: vi.fn(),
}))

vi.mock('../src/lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
      social: socialSignIn,
    },
  },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    to,
  }: {
    children: ReactNode
    className?: string
    to: string
  }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({ reset: undefined }),
}))

describe('authentication callbacks', () => {
  afterEach(cleanup)

  beforeEach(() => {
    socialSignIn.mockReset()
    socialSignIn.mockResolvedValue(undefined)
  })

  it('sends Google back to the web application after authentication', async () => {
    render(<LoginRoute />)

    fireEvent.click(screen.getByRole('button', { name: /Google/i }))

    await waitFor(() => {
      expect(socialSignIn).toHaveBeenCalledWith({
        callbackURL: 'http://localhost:5173/library',
        provider: 'google',
      })
    })
  })

  it('allows only one Google OAuth attempt at a time', async () => {
    let completeSignIn: (() => void) | undefined
    socialSignIn.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completeSignIn = resolve
        }),
    )
    render(<LoginRoute />)
    const googleButton = screen.getByRole('button', { name: /Google/i })

    fireEvent.click(googleButton)
    fireEvent.click(googleButton)

    await waitFor(() => {
      expect(socialSignIn).toHaveBeenCalledTimes(1)
      expect(googleButton).toBeDisabled()
    })

    completeSignIn?.()
  })

  it('builds callbacks only from the current web origin', () => {
    expect(getAuthCallbackUrl('/library')).toBe('http://localhost:5173/library')
    expect(getAuthCallbackUrl('/verify-email')).toBe(
      'http://localhost:5173/verify-email',
    )
    expect(getAuthCallbackUrl('/reset-password')).toBe(
      'http://localhost:5173/reset-password',
    )
  })
})
