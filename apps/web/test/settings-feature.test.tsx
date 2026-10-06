import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from '../src/app/theme-provider'
import { SettingsFeatureEntry } from '../src/features/settings/settings-feature-entry'

const { deleteUser, signOut, useSession } = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn(),
}))

vi.mock('../src/lib/auth-client', () => ({
  authClient: {
    deleteUser,
    signOut,
    useSession,
  },
}))

function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  queryClient.setQueryData(['items', 'detail', 'private-item'], {
    noteMarkdown: 'private cache',
  })

  const rootRoute = createRootRoute()
  const settingsRoute = createRoute({
    component: SettingsFeatureEntry,
    getParentRoute: () => rootRoute,
    path: '/settings',
  })
  const homeRoute = createRoute({
    component: () => <p>Signed-out home</p>,
    getParentRoute: () => rootRoute,
    path: '/',
  })
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/settings'] }),
    routeTree: rootRoute.addChildren([settingsRoute, homeRoute]),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>,
  )

  return { queryClient }
}

afterEach(cleanup)

describe('Settings feature', () => {
  beforeEach(() => {
    window.localStorage.clear()
    deleteUser.mockReset()
    signOut.mockReset()
    useSession.mockReset()
    useSession.mockReturnValue({
      data: {
        session: {
          expiresAt: '2026-08-10T08:30:00.000Z',
          id: 'session-1',
          userId: 'user-1',
        },
        user: {
          email: 'person@example.com',
          emailVerified: true,
          id: 'user-1',
          image: null,
          name: 'Person',
        },
      },
      isPending: false,
    })
  })

  it('selects and persists light, dark, and system appearance preferences', async () => {
    renderSettings()

    const system = await screen.findByRole('radio', { name: /^System/ })
    expect(system).toBeChecked()

    const dark = screen.getByRole('radio', { name: /^Dark/ })
    fireEvent.click(dark)
    expect(dark).toBeChecked()
    expect(system).not.toBeChecked()
    expect(window.localStorage.getItem('cerebero-theme')).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')

    const light = screen.getByRole('radio', { name: /^Light/ })
    fireEvent.click(light)
    expect(light).toBeChecked()
    expect(window.localStorage.getItem('cerebero-theme')).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')

    fireEvent.click(system)
    expect(system).toBeChecked()
    expect(light).not.toBeChecked()
    expect(window.localStorage.getItem('cerebero-theme')).toBe('system')
    expect(document.documentElement).toHaveAttribute('data-theme', 'system')
  })

  it('shows the Google profile and requires explicit account confirmation', async () => {
    renderSettings()

    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Person')).toBeInTheDocument()
    expect(screen.getByText('person@example.com')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Confirm delete account' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))

    expect(
      screen.getByRole('button', { name: 'Confirm delete account' }),
    ).toBeInTheDocument()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('deletes the session-derived account and clears private query data', async () => {
    deleteUser.mockResolvedValue({ data: { success: true }, error: null })
    const { queryClient } = renderSettings()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete account' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm delete account' }),
    )

    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith()
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    })
    expect(await screen.findByText('Signed-out home')).toBeInTheDocument()
  })

  it('clears private query data when signing out', async () => {
    signOut.mockResolvedValue({ data: { success: true }, error: null })
    const { queryClient } = renderSettings()

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith()
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    })
    expect(await screen.findByText('Signed-out home')).toBeInTheDocument()
  })

  it('explains when account deletion requires a fresh Google session', async () => {
    deleteUser.mockResolvedValue({
      data: null,
      error: { code: 'SESSION_EXPIRED', status: 400 },
    })
    renderSettings()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete account' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm delete account' }),
    )

    expect(
      await screen.findByText(/sign out and sign in again/i),
    ).toBeInTheDocument()
  })
})
