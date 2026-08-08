import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '../src/app/app-shell'
import { ThemeProvider } from '../src/app/theme-provider'

afterEach(cleanup)

function renderAppShell(
  options: { openCapture?: () => void; signOut?: () => void } = {},
) {
  const rootRoute = createRootRoute()
  const libraryRoute = createRoute({
    component: () => (
      <AppShell
        isSigningOut={false}
        openCapture={options.openCapture ?? (() => undefined)}
        signOut={options.signOut ?? (() => undefined)}
        signOutError={null}
        user={{ email: 'person@example.com', name: 'Person' }}
      >
        <section>
          <h1>Library</h1>
          <h2>Your Library is empty.</h2>
        </section>
      </AppShell>
    ),
    getParentRoute: () => rootRoute,
    path: '/library',
  })
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/library'] }),
    routeTree: rootRoute.addChildren([libraryRoute]),
  })

  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
}

describe('authenticated application shell', () => {
  it('provides one real navigation destination and a shell-ready Library', async () => {
    renderAppShell()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Library' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /Cerebero Library/ }),
    ).toHaveLength(2)
    expect(screen.getByText('person@example.com')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Your Library is empty.' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Inbox')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Capture' })).toHaveLength(2)
  })

  it('exposes accessible skip and sign-out actions', async () => {
    const openCapture = vi.fn()
    const signOut = vi.fn()
    renderAppShell({ openCapture, signOut })

    const skipLink = await screen.findByRole('link', {
      name: 'Skip to content',
    })
    expect(skipLink).toHaveAttribute('href', '#main-content')

    fireEvent.click(screen.getAllByRole('button', { name: 'Sign out' })[0]!)
    expect(signOut).toHaveBeenCalledOnce()

    fireEvent.click(screen.getAllByRole('button', { name: 'Capture' })[0]!)
    expect(openCapture).toHaveBeenCalledOnce()
  })
})
