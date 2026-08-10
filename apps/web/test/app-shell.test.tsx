import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '../src/app/app-shell'
import { ThemeProvider } from '../src/app/theme-provider'

afterEach(cleanup)

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.classList.remove('dark')
})

function renderAppShell(
  options: {
    initialEntry?: string
    openCapture?: () => void
    signOut?: () => void
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const rootRoute = createRootRoute()
  const libraryRoute = createRoute({
    component: () => (
      <AppShell
        isSigningOut={false}
        openCapture={options.openCapture ?? (() => undefined)}
        signOut={options.signOut ?? (() => undefined)}
        signOutError={null}
        user={{ email: 'person@example.com', image: null, name: 'Person' }}
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
    history: createMemoryHistory({
      initialEntries: [options.initialEntry ?? '/library'],
    }),
    routeTree: rootRoute.addChildren([libraryRoute]),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

describe('authenticated application shell', () => {
  it('provides workspace navigation and a shell-ready Library', async () => {
    renderAppShell()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Library' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Primary mobile navigation' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /Cerebero Library/ }),
    ).toHaveLength(2)
    expect(
      screen.getAllByRole('link', { name: 'Library' }).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Search' })).toBeNull()
    expect(
      screen.getAllByRole('link', { name: 'Archive' }).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('link', { name: 'Trash' }).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('link', { name: 'Settings' }).length,
    ).toBeGreaterThan(0)
    const sidebar = screen.getByRole('complementary', {
      name: 'Workspace sidebar',
    })
    const activeLibraryLink = within(sidebar).getByRole('link', {
      name: 'Library',
    })
    expect(activeLibraryLink).toHaveClass('text-primary')
    expect(activeLibraryLink).not.toHaveClass('bg-sunken')
    expect(activeLibraryLink).not.toHaveClass('border-accent-strong')
    expect(within(sidebar).getByText('Person')).toBeInTheDocument()
    expect(within(sidebar).queryByText('person@example.com')).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Your Library is empty.' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Inbox')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Capture' })).toHaveLength(2)
  })

  it('keeps Library active when filters are present in the URL', async () => {
    renderAppShell({ initialEntry: '/library?kind=link' })

    const sidebar = await screen.findByRole('complementary', {
      name: 'Workspace sidebar',
    })
    expect(within(sidebar).getByRole('link', { name: 'Library' })).toHaveClass(
      'text-primary',
    )
  })

  it('exposes accessible skip and sign-out actions', async () => {
    const openCapture = vi.fn()
    const signOut = vi.fn()
    renderAppShell({ openCapture, signOut })

    const skipLink = await screen.findByRole('link', {
      name: 'Skip to content',
    })
    expect(skipLink).toHaveAttribute('href', '#main-content')

    const sidebar = screen.getByRole('complementary', {
      name: 'Workspace sidebar',
    })
    fireEvent.click(
      within(sidebar).getByRole('button', { name: 'Open profile menu' }),
    )
    fireEvent.click(within(sidebar).getByRole('menuitem', { name: 'Sign out' }))
    expect(signOut).toHaveBeenCalledOnce()

    fireEvent.click(screen.getAllByRole('button', { name: 'Capture' })[0]!)
    expect(openCapture).toHaveBeenCalledOnce()
  })

  it('collapses the desktop sidebar to labeled icon controls and remembers it', async () => {
    renderAppShell()

    const sidebar = await screen.findByRole('complementary', {
      name: 'Workspace sidebar',
    })
    fireEvent.click(
      within(sidebar).getByRole('button', { name: 'Collapse sidebar' }),
    )

    expect(
      within(sidebar).getByRole('button', { name: 'Expand sidebar' }),
    ).toBeInTheDocument()
    expect(within(sidebar).getByText('C')).toBeInTheDocument()
    expect(within(sidebar).queryByText('Workspace')).toBeNull()
    expect(within(sidebar).queryByText('Library')).toBeNull()
    expect(
      within(sidebar).getByRole('link', { name: 'Library' }),
    ).toBeInTheDocument()
    expect(
      within(sidebar).getByRole('button', { name: 'Capture' }),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem('cerebero-sidebar-collapsed')).toBe(
      'true',
    )
  })

  it('places theme above the profile and keeps account actions in its menu', async () => {
    const signOut = vi.fn()
    renderAppShell({ signOut })

    const sidebar = await screen.findByRole('complementary', {
      name: 'Workspace sidebar',
    })
    const themeButton = within(sidebar).getByRole('button', {
      name: 'Switch to dark theme',
    })
    fireEvent.click(themeButton)

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark')
    })

    fireEvent.click(
      within(sidebar).getByRole('button', { name: 'Open profile menu' }),
    )
    expect(
      within(sidebar).getByRole('menuitem', { name: 'Settings' }),
    ).toBeInTheDocument()
    expect(
      within(sidebar).queryByRole('menuitem', {
        name: 'Switch to light theme',
      }),
    ).toBeNull()
    expect(within(sidebar).getByText('person@example.com')).toBeInTheDocument()
    fireEvent.click(within(sidebar).getByRole('menuitem', { name: 'Sign out' }))
    expect(signOut).toHaveBeenCalledOnce()
  })

  it('keeps the profile menu above page content and opens shortcut help', async () => {
    renderAppShell()

    const sidebar = await screen.findByRole('complementary', {
      name: 'Workspace sidebar',
    })
    expect(sidebar).toHaveClass('z-40')

    fireEvent.click(
      within(sidebar).getByRole('button', { name: 'Open profile menu' }),
    )
    expect(within(sidebar).getByRole('menu')).toHaveClass('z-[70]')

    fireEvent.click(
      within(sidebar).getByRole('menuitem', {
        name: 'Keyboard shortcuts',
      }),
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Keyboard shortcuts',
    })
    expect(within(dialog).getByText('Toggle theme')).toBeInTheDocument()
    expect(within(dialog).getByText('Navigate results')).toBeInTheDocument()
    expect(within(dialog).getByText('Save to Library')).toBeInTheDocument()
  })

  it('opens shortcut help with Command+/ or Control+/', async () => {
    renderAppShell()

    await screen.findByRole('heading', { name: 'Library' })
    fireEvent.keyDown(document, { code: 'Slash', key: '/', metaKey: true })
    expect(
      screen.getByRole('dialog', { name: 'Keyboard shortcuts' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Close keyboard shortcuts' }),
    )
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Keyboard shortcuts' }),
      ).toBeNull()
    })

    fireEvent.keyDown(document, { code: 'Slash', ctrlKey: true, key: '/' })
    expect(
      screen.getByRole('dialog', { name: 'Keyboard shortcuts' }),
    ).toBeInTheDocument()
  })

  it('toggles theme with D unless the user is typing', async () => {
    renderAppShell()

    await screen.findByRole('heading', { name: 'Library' })
    fireEvent.keyDown(document, { key: 'd' })
    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark')
    })

    fireEvent.keyDown(document, { key: 'D', shiftKey: true })
    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass('dark')
    })

    const input = document.createElement('input')
    document.body.append(input)
    fireEvent.keyDown(input, { key: 'd' })
    expect(document.documentElement).not.toHaveClass('dark')
    input.remove()
  })

  it('toggles the desktop sidebar with Command+B or Control+B', async () => {
    renderAppShell()

    const sidebar = await screen.findByRole('complementary', {
      name: 'Workspace sidebar',
    })
    fireEvent.keyDown(document, { key: 'b', metaKey: true })
    expect(
      within(sidebar).getByRole('button', { name: 'Expand sidebar' }),
    ).toBeInTheDocument()

    fireEvent.keyDown(document, { ctrlKey: true, key: 'B' })
    expect(
      within(sidebar).getByRole('button', { name: 'Collapse sidebar' }),
    ).toBeInTheDocument()
  })
})
