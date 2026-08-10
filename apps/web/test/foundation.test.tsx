import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from '../src/app/theme-provider'
import { LandingRoute } from '../src/routes/index'

const { socialSignIn, useSession } = vi.hoisted(() => ({
  socialSignIn: vi.fn(),
  useSession: vi.fn(),
}))

vi.mock('../src/lib/auth-client', () => ({
  authClient: {
    signIn: { social: socialSignIn },
    useSession,
  },
}))

afterEach(cleanup)

function renderLanding() {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    component: LandingRoute,
    getParentRoute: () => rootRoute,
    path: '/',
  })
  const privacyRoute = createRoute({
    component: () => null,
    getParentRoute: () => rootRoute,
    path: '/privacy',
  })
  const termsRoute = createRoute({
    component: () => null,
    getParentRoute: () => rootRoute,
    path: '/terms',
  })
  const libraryRoute = createRoute({
    component: () => null,
    getParentRoute: () => rootRoute,
    path: '/library',
  })
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    routeTree: rootRoute.addChildren([
      indexRoute,
      privacyRoute,
      termsRoute,
      libraryRoute,
    ]),
  })
  const queryClient = new QueryClient()

  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>,
  )

  return { ...rendered, router }
}

describe('Landing page', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.theme
    socialSignIn.mockReset()
    socialSignIn.mockResolvedValue(undefined)
    useSession.mockReset()
    useSession.mockReturnValue({ data: null, isPending: false })
  })

  it('presents the locked editorial structure with product proof', async () => {
    renderLanding()

    expect(
      await screen.findByRole('heading', {
        name: 'Keep the things worth coming back to.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/links and notes together in one private/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Get Started' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Cerebero workflow preview' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Save' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Organize' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Find' })).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Footer' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Cerebero on GitHub' }),
    ).toHaveAttribute('href', 'https://github.com/Shubbu03/cerebero')
    expect(screen.queryByText(/Inbox/i)).not.toBeInTheDocument()
  })

  it('starts in system theme and toggles from one icon button', async () => {
    renderLanding()

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('system')
    })
    expect(window.localStorage.getItem('cerebero-theme')).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Theme' })).toBeNull()

    const themeButton = screen.getByRole('button', {
      name: 'Switch to dark theme',
    })
    fireEvent.click(themeButton)

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark')
      expect(document.documentElement.dataset.theme).toBe('dark')
    })
    expect(window.localStorage.getItem('cerebero-theme')).toBe('dark')
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument()
  })

  it('starts Google directly from the header without a login page', async () => {
    renderLanding()

    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(socialSignIn).toHaveBeenCalledWith({
        callbackURL: 'http://localhost:5173/library',
        provider: 'google',
      })
    })
  })

  it('locks duplicate Google attempts and reports provider failures', async () => {
    let rejectSignIn: ((reason?: unknown) => void) | undefined
    socialSignIn.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectSignIn = reject
        }),
    )
    renderLanding()

    const googleButton = await screen.findByRole('button', {
      name: 'Get Started',
    })
    fireEvent.click(googleButton)
    fireEvent.click(googleButton)

    await waitFor(() => {
      expect(socialSignIn).toHaveBeenCalledTimes(1)
      expect(googleButton).toBeDisabled()
    })

    rejectSignIn?.(new Error('provider unavailable'))
    expect(
      await screen.findByText(
        'Google sign-in could not be completed. Try again.',
      ),
    ).toBeInTheDocument()
  })

  it('redirects an existing session directly to Library', async () => {
    useSession.mockReturnValue({
      data: { session: { id: 'session-1' }, user: { id: 'user-1' } },
      isPending: false,
    })
    const { router } = renderLanding()

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/library')
    })
    expect(
      screen.queryByRole('heading', {
        name: 'Keep the things worth coming back to.',
      }),
    ).not.toBeInTheDocument()
  })

  it('keeps the landing page mounted during a background session refresh', async () => {
    let updatePendingState: ((isPending: boolean) => void) | undefined
    useSession.mockImplementation(function useSessionTestState() {
      const [isPending, setIsPending] = useState(false)
      updatePendingState = setIsPending
      return { data: null, isPending }
    })
    renderLanding()

    expect(
      await screen.findByRole('heading', {
        name: 'Keep the things worth coming back to.',
      }),
    ).toBeInTheDocument()

    act(() => updatePendingState?.(true))

    expect(
      screen.getByRole('heading', {
        name: 'Keep the things worth coming back to.',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Opening your Library…')).toBeNull()
  })
})
