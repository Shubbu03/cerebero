import type { ItemPage, ItemView } from '@cerebero/contracts'
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
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LibraryFeatureEntry } from '../src/features/library/library-feature-entry'

const { getApi } = vi.hoisted(() => ({ getApi: vi.fn() }))

vi.mock('../src/lib/api-client', () => ({
  apiClient: { get: getApi },
}))

const createdAt = '2026-08-08T08:30:00.000Z'

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
        id: '22222222-2222-4222-8222-222222222222',
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

function renderLibrary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const rootRoute = createRootRoute()
  const libraryRoute = createRoute({
    component: LibraryFeatureEntry,
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
    getApi.mockResolvedValue({ data: createPage([createItem()]) })

    renderLibrary()

    expect(
      await screen.findByRole('heading', { name: 'A useful reference' }),
    ).toBeInTheDocument()
    expect(getApi).toHaveBeenCalledWith('/items', {
      params: { cursor: undefined, limit: 25, status: 'library' },
    })
    expect(screen.getByText('1 saved')).toBeInTheDocument()
    expect(screen.getByText('Research')).toBeInTheDocument()
    expect(screen.queryByText(/Inbox/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/enrichment/i)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /File to Library/i }),
    ).not.toBeInTheDocument()
  })

  it('renders a direct-capture empty state', async () => {
    getApi.mockResolvedValue({ data: createPage([]) })

    renderLibrary()

    expect(
      await screen.findByRole('heading', { name: 'Your Library is empty.' }),
    ).toBeInTheDocument()
    expect(screen.getByText('0 saved')).toBeInTheDocument()
  })

  it('turns invalid data into a recoverable error', async () => {
    getApi
      .mockResolvedValueOnce({ data: { items: [{ id: 'not-an-item' }] } })
      .mockResolvedValueOnce({ data: createPage([]) })

    renderLibrary()

    expect(
      await screen.findByRole('heading', {
        name: 'Your Library could not be opened.',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('heading', { name: 'Your Library is empty.' }),
    ).toBeInTheDocument()
  })

  it('loads the next page without replacing existing Items', async () => {
    const secondItem = createItem({
      displayTitle: 'A second Item',
      id: '33333333-3333-4333-8333-333333333333',
      kind: 'note',
      originalUrl: null,
    })
    getApi
      .mockResolvedValueOnce({ data: createPage([createItem()], 'next-page') })
      .mockResolvedValueOnce({ data: createPage([secondItem]) })

    renderLibrary()
    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }))

    expect(
      await screen.findByRole('heading', { name: 'A second Item' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'A useful reference' }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(getApi).toHaveBeenLastCalledWith('/items', {
        params: { cursor: 'next-page', limit: 25, status: 'library' },
      })
    })
  })
})
