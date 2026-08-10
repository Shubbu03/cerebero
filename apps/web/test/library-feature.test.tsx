import type { ItemPage, ItemView, TagList } from '@cerebero/contracts'
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

import { LibraryFeatureEntry } from '../src/features/library/library-feature-entry'
import {
  defaultLibraryListFilters,
  type LibraryListFilters,
} from '../src/features/library/data-access/library-items-query-key'
import { librarySearchSchema } from '../src/features/library/library-search-schema'
import { LibraryRoute } from '../src/features/library/library-route'
import { toLibraryListFilters } from '../src/features/library/to-library-list-filters'
import { SearchFeatureEntry } from '../src/features/search/search-feature-entry'

const { getApi } = vi.hoisted(() => ({ getApi: vi.fn() }))

vi.mock('../src/lib/api-client', () => ({
  apiClient: { get: getApi },
}))

const createdAt = '2026-08-08T08:30:00.000Z'
const tagId = '22222222-2222-4222-8222-222222222222'

function createItem(overrides: Partial<ItemView> = {}): ItemView {
  return {
    authoredTitle: 'A useful reference',
    createdAt,
    displayTitle: 'A useful reference',
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'link',
    noteMarkdown: 'Read this before planning the next release.',
    originalUrl: 'https://example.com/reference',
    pinnedAt: null,
    status: 'library',
    tags: [
      {
        createdAt,
        id: tagId,
        name: 'Research',
      },
    ],
    trashedAt: null,
    updatedAt: createdAt,
    version: 1,
    ...overrides,
  }
}

function createPage(items: ItemView[], nextCursor: string | null = null) {
  return { items, nextCursor } satisfies ItemPage
}

function createTagList(): TagList {
  return {
    tags: [{ createdAt, id: tagId, name: 'Research' }],
  }
}

function renderLibrary(
  filters: LibraryListFilters = defaultLibraryListFilters,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const rootRoute = createRootRoute({ component: Outlet })
  const libraryRoute = createRoute({
    component: () => (
      <SearchFeatureEntry>
        <LibraryFeatureEntry filters={filters} />
      </SearchFeatureEntry>
    ),
    getParentRoute: () => rootRoute,
    path: '/library',
    validateSearch: librarySearchSchema,
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

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function renderRoutedLibrary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const rootRoute = createRootRoute({ component: Outlet })
  const libraryRoute = createRoute({
    component: function RoutedLibrary() {
      return (
        <SearchFeatureEntry>
          <LibraryFeatureEntry
            filters={toLibraryListFilters(libraryRoute.useSearch())}
          />
        </SearchFeatureEntry>
      )
    },
    getParentRoute: () => rootRoute,
    path: '/library',
    validateSearch: librarySearchSchema,
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

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  getApi.mockReset()
})

describe('Library data feature', () => {
  it('queries and renders saved Items without review or enrichment UI', async () => {
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: createPage([createItem()]) }
    })

    renderLibrary()

    expect(
      await screen.findByRole('heading', { name: 'A useful reference' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveClass('cursor-pointer')
    expect(
      screen.getByRole('link', { name: 'Open A useful reference' }),
    ).toHaveAttribute('href', '/items/11111111-1111-4111-8111-111111111111')
    expect(getApi).toHaveBeenCalledWith('/items', {
      params: {
        cursor: undefined,
        kind: undefined,
        limit: 5,
        pinned: 'false',
        sort: 'created_desc',
        status: 'library',
        tag: undefined,
      },
    })
    expect(
      screen.queryByRole('navigation', { name: 'Library pagination' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Private Library')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Everything you capture is saved here immediately.'),
    ).not.toBeInTheDocument()
    expect(screen.getAllByText('#Research').length).toBeGreaterThan(0)
    expect(screen.queryByText(/Inbox/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/enrichment/i)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /File to Library/i }),
    ).not.toBeInTheDocument()
  })

  it('renders a direct-capture empty state', async () => {
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: createPage([]) }
    })

    renderLibrary()

    expect(
      await screen.findByRole('heading', { name: 'Your Library is empty.' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Library pagination' }),
    ).not.toBeInTheDocument()
  })

  it('does not create an empty page from pinned Items in an overflowing cache page', async () => {
    const pinnedItems = Array.from({ length: 2 }, (_, index) =>
      createItem({
        displayTitle: `Pinned overflow ${index + 1}`,
        id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        pinnedAt: `2026-08-10T0${index + 1}:00:00.000Z`,
      }),
    )
    const regularItems = Array.from({ length: 5 }, (_, index) =>
      createItem({
        displayTitle: `Regular overflow ${index + 1}`,
        id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        pinnedAt: null,
      }),
    )

    getApi.mockImplementation(
      (path: string, options?: { params?: { pinned?: string } }) => {
        if (path === '/tags') return { data: createTagList() }
        if (options?.params?.pinned === 'true') {
          return { data: createPage(pinnedItems) }
        }
        if (options?.params?.pinned === 'false') {
          return { data: createPage(regularItems) }
        }
        return { data: createPage([...regularItems, ...pinnedItems]) }
      },
    )

    renderLibrary()

    await screen.findByRole('heading', { name: 'Regular overflow 5' })
    expect(screen.getAllByLabelText('Pinned')).toHaveLength(2)
    expect(
      screen.queryByRole('navigation', { name: 'Library pagination' }),
    ).not.toBeInTheDocument()
    expect(getApi).toHaveBeenCalledWith('/items', {
      params: {
        cursor: undefined,
        kind: undefined,
        limit: 5,
        pinned: 'false',
        sort: 'created_desc',
        status: 'library',
        tag: undefined,
      },
    })
  })

  it('keeps filters collapsed and opens search and tag management as dialogs', async () => {
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: createPage([createItem()]) }
    })

    renderLibrary()

    await screen.findByRole('heading', { name: 'A useful reference' })
    expect(screen.queryByLabelText('Filter by kind')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(
      screen.getByRole('dialog', { name: 'Search your Library' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close search' }))

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    expect(screen.getByLabelText('Filter by kind')).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Filter by pin state'),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Manage tags' }))
    expect(
      screen.getByRole('dialog', { name: 'Manage tags' }),
    ).toBeInTheDocument()
  })

  it('shows only the three newest tags in the filter popup', async () => {
    const tags: TagList = {
      tags: [
        {
          createdAt: '2026-08-01T08:30:00.000Z',
          id: '10000000-0000-4000-8000-000000000001',
          name: 'Old tag',
        },
        {
          createdAt: '2026-08-02T08:30:00.000Z',
          id: '10000000-0000-4000-8000-000000000002',
          name: 'Recent one',
        },
        {
          createdAt: '2026-08-03T08:30:00.000Z',
          id: '10000000-0000-4000-8000-000000000003',
          name: 'Recent two',
        },
        {
          createdAt: '2026-08-04T08:30:00.000Z',
          id: '10000000-0000-4000-8000-000000000004',
          name: 'Newest tag',
        },
      ],
    }
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: tags }
      }
      return { data: createPage([createItem({ tags: [] })]) }
    })

    renderLibrary()
    await screen.findByRole('heading', { name: 'A useful reference' })
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

    expect(screen.getByText('#Newest tag')).toBeInTheDocument()
    expect(screen.getByText('#Recent two')).toBeInTheDocument()
    expect(screen.getByText('#Recent one')).toBeInTheDocument()
    expect(screen.queryByText('#Old tag')).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByLabelText('Filter by kind')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveFocus()
  })

  it('hides nonmatching cached Items immediately while a tag request is pending', async () => {
    let finishFilteredRequest:
      ((response: { data: ItemPage }) => void) | undefined
    const matchingItem = createItem()
    const nonmatchingItem = createItem({
      displayTitle: 'Unrelated Item',
      id: '33333333-3333-4333-8333-333333333333',
      tags: [],
    })
    getApi.mockImplementation(
      (path: string, options?: { params?: { tag?: string[] } }) => {
        if (path === '/tags') {
          return { data: createTagList() }
        }
        if (options?.params?.tag?.includes(tagId)) {
          return new Promise<{ data: ItemPage }>((resolve) => {
            finishFilteredRequest = resolve
          })
        }
        return { data: createPage([matchingItem, nonmatchingItem]) }
      },
    )

    renderRoutedLibrary()
    await screen.findByRole('heading', { name: 'Unrelated Item' })
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: '#Research' }))

    await waitFor(() => {
      expect(finishFilteredRequest).toEqual(expect.any(Function))
    })
    expect(
      screen.getByRole('heading', { name: 'A useful reference' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Unrelated Item' }),
    ).not.toBeInTheDocument()

    finishFilteredRequest?.({ data: createPage([matchingItem]) })
  })

  it('turns invalid data into a recoverable error', async () => {
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: { items: [{ id: 'not-an-item' }] } }
    })

    renderLibrary()

    expect(
      await screen.findByRole('heading', {
        name: 'Your Library could not be opened.',
      }),
    ).toBeInTheDocument()

    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: createPage([]) }
    })

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('heading', { name: 'Your Library is empty.' }),
    ).toBeInTheDocument()
  })

  it('moves between cached five-Item pages', async () => {
    const secondItem = createItem({
      displayTitle: 'A second Item',
      id: '33333333-3333-4333-8333-333333333333',
      kind: 'note',
      originalUrl: null,
    })
    getApi.mockImplementation(
      (path: string, options?: { params?: { cursor?: string } }) => {
        if (path === '/tags') {
          return { data: createTagList() }
        }
        if (options?.params?.cursor === 'next-page') {
          return { data: createPage([secondItem]) }
        }
        return { data: createPage([createItem()], 'next-page') }
      },
    )

    renderLibrary()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Next Library page' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'A second Item' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'A useful reference' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    await waitFor(() => {
      expect(getApi).toHaveBeenCalledWith('/items', {
        params: {
          cursor: 'next-page',
          kind: undefined,
          limit: 5,
          pinned: 'false',
          sort: 'created_desc',
          status: 'library',
          tag: undefined,
        },
      })
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Previous Library page' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'A useful reference' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'A second Item' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('keeps optimistic overflow Items reachable before the server refetch finishes', async () => {
    const items = Array.from({ length: 8 }, (_, index) =>
      createItem({
        displayTitle: `Saved Item ${index + 1}`,
        id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
      }),
    )
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: createPage(items) }
    })

    renderLibrary()

    expect(
      await screen.findByRole('heading', { name: 'Saved Item 1' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Saved Item 6' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next Library page' }))
    expect(
      await screen.findByRole('heading', { name: 'Saved Item 6' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Saved Item 1' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('applies kind and sort filters when provided', async () => {
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return {
        data: createPage([createItem({ kind: 'note', originalUrl: null })]),
      }
    })

    renderLibrary({ kind: 'note', sort: 'title_asc' })

    expect(
      await screen.findByRole('heading', { name: 'A useful reference' }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(getApi).toHaveBeenCalledWith('/items', {
        params: {
          cursor: undefined,
          kind: 'note',
          limit: 5,
          pinned: 'false',
          sort: 'title_asc',
          status: 'library',
          tag: undefined,
        },
      })
    })
    expect(screen.queryByLabelText('Filter by kind')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.getByLabelText('Filter by kind')).toHaveValue('note')
    expect(screen.getByLabelText('Sort Library')).toHaveValue('title_asc')
  })

  it('maps Library search params into list filters', () => {
    expect(
      toLibraryListFilters(
        librarySearchSchema.parse({
          kind: 'link',
          pinned: 'true',
          sort: 'updated_desc',
          tag: tagId,
        }),
      ),
    ).toEqual({
      kind: 'link',
      pinned: undefined,
      sort: 'updated_desc',
      tag: [tagId],
    })
  })

  it('places three pinned Items before regular Items on page one only', async () => {
    const pinnedItems = Array.from({ length: 3 }, (_, index) =>
      createItem({
        displayTitle: `Pinned Item ${index + 1}`,
        id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        pinnedAt: `2026-08-10T0${index + 1}:00:00.000Z`,
      }),
    )
    const firstRegularItem = createItem({ displayTitle: 'Regular Item 1' })
    const secondRegularItem = createItem({
      displayTitle: 'Regular Item 2',
      id: '30000000-0000-4000-8000-000000000002',
    })
    getApi.mockImplementation(
      (
        path: string,
        options?: { params?: { cursor?: string; pinned?: string } },
      ) => {
        if (path === '/tags') return { data: createTagList() }
        if (options?.params?.pinned === 'true') {
          return { data: createPage(pinnedItems) }
        }
        if (options?.params?.cursor === 'next-page') {
          return { data: createPage([secondRegularItem]) }
        }
        return { data: createPage([firstRegularItem], 'next-page') }
      },
    )

    renderLibrary()

    await screen.findByRole('heading', { name: 'Regular Item 1' })
    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      'Pinned Item 1',
      'Pinned Item 2',
      'Pinned Item 3',
      'Regular Item 1',
    ])
    expect(screen.getAllByLabelText('Pinned')).toHaveLength(3)
    expect(screen.queryByText('Pinned')).not.toBeInTheDocument()
    const pinnedItemsRegion = screen.getByLabelText('Pinned items')
    expect(pinnedItemsRegion).toHaveClass('md:grid-cols-3')
    expect(pinnedItemsRegion.querySelector('time')?.parentElement).toHaveClass(
      'col-start-3',
      'row-start-1',
      'text-right',
    )
    expect(getApi).toHaveBeenCalledWith('/items', {
      params: {
        cursor: undefined,
        kind: undefined,
        limit: 3,
        pinned: 'true',
        sort: 'created_desc',
        status: 'library',
        tag: undefined,
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next Library page' }))
    expect(
      await screen.findByRole('heading', { name: 'Regular Item 2' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Pinned')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Pinned Item 1' }),
    ).not.toBeInTheDocument()
  })

  it('exposes a route component for authenticated Library navigation', () => {
    expect(LibraryRoute).toEqual(expect.any(Function))
  })
})
