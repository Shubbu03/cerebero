import type { ItemPage, ItemView } from '@cerebero/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SearchFeatureEntry } from '../src/features/search/search-feature-entry'
import { useSearchDialog } from '../src/features/search/search-dialog-context'

const { getApi } = vi.hoisted(() => ({ getApi: vi.fn() }))

vi.mock('../src/lib/api-client', () => ({
  apiClient: { get: getApi },
}))

const createdAt = '2026-08-08T08:30:00.000Z'

function createItem(): ItemView {
  return {
    authoredTitle: 'Neural notebooks',
    createdAt,
    displayTitle: 'Neural notebooks',
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'note',
    noteMarkdown: 'Notes about retrieval.',
    originalUrl: null,
    pinnedAt: null,
    status: 'library',
    tags: [
      {
        createdAt,
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Research',
      },
    ],
    trashedAt: null,
    updatedAt: createdAt,
    version: 1,
  }
}

function createPage(items: ItemView[]): ItemPage {
  return { items, nextCursor: null }
}

function SearchTrigger() {
  const { openSearch } = useSearchDialog()
  return <button onClick={openSearch}>Open search</button>
}

function renderSearch() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const rootRoute = createRootRoute({ component: Outlet })
  const libraryRoute = createRoute({
    component: () => (
      <SearchFeatureEntry>
        <SearchTrigger />
      </SearchFeatureEntry>
    ),
    getParentRoute: () => rootRoute,
    path: '/library',
  })
  const itemRoute = createRoute({
    component: () => null,
    getParentRoute: () => rootRoute,
    path: '/items/$itemId',
  })
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/library'] }),
    routeTree: rootRoute.addChildren([libraryRoute, itemRoute]),
  })

  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { ...renderResult, router }
}

async function openAndType(query: string) {
  fireEvent.click(await screen.findByRole('button', { name: 'Open search' }))
  fireEvent.change(
    screen.getByRole('combobox', { name: 'Search your Library' }),
    {
      target: { value: query },
    },
  )
}

afterEach(() => {
  cleanup()
  getApi.mockReset()
})

describe('Search dialog', () => {
  it('opens with Command+K without calling the API before a query exists', async () => {
    renderSearch()

    await screen.findByRole('button', { name: 'Open search' })

    fireEvent.keyDown(document, { key: 'k', metaKey: true })

    expect(
      screen.getByRole('dialog', { name: 'Search your Library' }),
    ).toBeInTheDocument()
    expect(screen.getByText('↑')).toBeInTheDocument()
    expect(screen.getByText('↓')).toBeInTheDocument()
    expect(screen.getByText('Enter')).toBeInTheDocument()
    expect(screen.getByText('Esc')).toBeInTheDocument()
    expect(getApi).not.toHaveBeenCalled()
  })

  it('loads matching results inside the dialog', async () => {
    getApi.mockResolvedValue({ data: createPage([createItem()]) })
    renderSearch()
    await openAndType('neural')

    expect(
      await screen.findByRole('link', { name: /Neural notebooks/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(/#Research/)).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: 'Search your Library' }),
    ).toHaveAttribute('placeholder', 'Search titles, notes, URLs, and #tags')
    await waitFor(() => {
      const searchCalls = getApi.mock.calls.filter(
        (call) => call[0] === '/search',
      )
      expect(searchCalls.length).toBeGreaterThan(0)
      const options = searchCalls[0]?.[1] as
        { params?: { q?: string } } | undefined
      expect(options?.params?.q).toBe('neural')
    })
  })

  it('debounces rapid input and searches only the final value', async () => {
    getApi.mockResolvedValue({ data: createPage([createItem()]) })
    renderSearch()

    fireEvent.click(await screen.findByRole('button', { name: 'Open search' }))
    const input = screen.getByRole('combobox', { name: 'Search your Library' })
    fireEvent.change(input, { target: { value: 'ship' } })
    fireEvent.change(input, { target: { value: 'shippu' } })

    expect(getApi).not.toHaveBeenCalled()
    await waitFor(() => {
      const searchCalls = getApi.mock.calls.filter(
        (call) => call[0] === '/search',
      )
      expect(searchCalls).toHaveLength(1)
      expect(searchCalls[0]?.[1]).toMatchObject({
        params: { q: 'shippu' },
      })
    })
  })

  it('accepts the displayed hash prefix when searching for a tag', async () => {
    getApi.mockResolvedValue({ data: createPage([createItem()]) })
    renderSearch()
    await openAndType('#Research')

    expect(await screen.findByText(/#Research/)).toBeInTheDocument()
    await waitFor(() => {
      const searchCalls = getApi.mock.calls.filter(
        (call) => call[0] === '/search',
      )
      expect(searchCalls).toHaveLength(1)
      expect(searchCalls[0]?.[1]).toMatchObject({
        params: { q: 'Research', scope: 'tags' },
      })
    })
  })

  it('hides broad matches immediately when switching into tag-only search', async () => {
    const titleOnlyItem = {
      ...createItem(),
      authoredTitle: 'Git title only',
      displayTitle: 'Git title only',
      tags: [],
    }
    let resolveTagSearch: ((page: ItemPage) => void) | undefined
    const tagSearch = new Promise<ItemPage>((resolve) => {
      resolveTagSearch = resolve
    })
    getApi.mockImplementation(
      (_path: string, options?: { params?: { scope?: string } }) => {
        if (options?.params?.scope === 'tags') {
          return tagSearch.then((data) => ({ data }))
        }

        return Promise.resolve({ data: createPage([titleOnlyItem]) })
      },
    )
    renderSearch()
    await openAndType('git')

    expect(
      await screen.findByRole('link', { name: /Git title only/ }),
    ).toBeInTheDocument()

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Search your Library' }),
      { target: { value: '#git' } },
    )

    expect(
      screen.queryByRole('link', { name: /Git title only/ }),
    ).not.toBeInTheDocument()

    await waitFor(() => {
      const tagCall = getApi.mock.calls.find((call) => {
        const options = call[1] as
          { params?: { scope?: string | undefined } } | undefined
        return call[0] === '/search' && options?.params?.scope === 'tags'
      })
      const options = tagCall?.[1] as
        | { params?: { q?: string | undefined; scope?: string | undefined } }
        | undefined
      expect(options?.params).toMatchObject({
        q: 'git',
        scope: 'tags',
      })
    })
    resolveTagSearch?.(createPage([]))
  })

  it('moves through results with the arrow keys and opens the active result with Enter', async () => {
    const secondItem = {
      ...createItem(),
      authoredTitle: 'Second result',
      displayTitle: 'Second result',
      id: '33333333-3333-4333-8333-333333333333',
    }
    getApi.mockResolvedValue({
      data: createPage([createItem(), secondItem]),
    })
    const { router } = renderSearch()
    await openAndType('result')

    await screen.findByRole('link', { name: /Second result/ })
    const input = screen.getByRole('combobox', {
      name: 'Search your Library',
    })
    const results = screen.getAllByRole('option')
    expect(results[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(results[1]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(results[0]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        '/items/33333333-3333-4333-8333-333333333333',
      )
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clears the query after the dialog closes', async () => {
    getApi.mockResolvedValue({ data: createPage([]) })
    renderSearch()
    await openAndType('neural')

    fireEvent.click(screen.getByRole('button', { name: 'Close search' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open search' }))

    expect(
      screen.getByRole('combobox', { name: 'Search your Library' }),
    ).toHaveValue('')
    expect(
      screen.getByText('Start typing to search your collection.'),
    ).toBeInTheDocument()
  })

  it('shows an empty result state', async () => {
    getApi.mockResolvedValue({ data: createPage([]) })
    renderSearch()
    await openAndType('missing-term')

    expect(
      await screen.findByText('No results for “missing-term”.'),
    ).toBeInTheDocument()
  })

  it('recovers from a failed search', async () => {
    getApi.mockRejectedValue(new Error('unavailable'))
    renderSearch()
    await openAndType('neural')

    expect(
      await screen.findByText('Search could not be completed.'),
    ).toBeInTheDocument()

    getApi.mockResolvedValue({ data: createPage([createItem()]) })
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('link', { name: /Neural notebooks/ }),
    ).toBeInTheDocument()
  })
})
