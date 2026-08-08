import type { ItemView } from '@cerebero/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ItemDetailFeatureEntry } from '../src/features/items/item-detail-feature-entry'

const { getApi } = vi.hoisted(() => ({ getApi: vi.fn() }))

vi.mock('../src/lib/api-client', () => ({
  apiClient: { get: getApi },
}))

const itemId = '11111111-1111-4111-8111-111111111111'
const createdAt = '2026-08-08T08:30:00.000Z'

function createItem(overrides: Partial<ItemView> = {}): ItemView {
  return {
    authoredTitle: 'A useful reference',
    createdAt,
    displayTitle: 'A useful reference',
    id: itemId,
    kind: 'link',
    noteMarkdown: 'Read this before planning the next release.',
    originalUrl: 'https://example.com/reference',
    pinnedAt: null,
    status: 'library',
    tags: [],
    trashedAt: null,
    updatedAt: createdAt,
    version: 1,
    ...overrides,
  }
}

function renderItemDetail(routeItemId = itemId) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const rootRoute = createRootRoute()
  const libraryRoute = createRoute({
    component: () => null,
    getParentRoute: () => rootRoute,
    path: '/library',
  })
  const itemRoute = createRoute({
    component: () => <ItemDetailFeatureEntry itemId={routeItemId} />,
    getParentRoute: () => rootRoute,
    path: '/items/$itemId',
  })
  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: [`/items/${routeItemId}`],
    }),
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

describe('Item detail feature', () => {
  it('rejects an invalid route ID without crossing the API boundary', async () => {
    renderItemDetail('not-an-item-id')

    expect(
      await screen.findByRole('heading', {
        name: 'Nothing can be opened here.',
      }),
    ).toBeInTheDocument()
    expect(getApi).not.toHaveBeenCalled()
  })

  it('renders validated authored data strictly as text', async () => {
    const unsafeLookingNote = 'Keep <script>alert("no")</script> as plain text.'
    getApi.mockResolvedValue({
      data: createItem({ noteMarkdown: unsafeLookingNote }),
    })

    const { container } = renderItemDetail()

    expect(
      await screen.findByRole('heading', { name: 'A useful reference' }),
    ).toBeInTheDocument()
    expect(screen.getByText(unsafeLookingNote)).toBeInTheDocument()
    expect(
      screen.getByText('https://example.com/reference'),
    ).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('uses the same ownership-neutral state for a missing Item', async () => {
    getApi.mockRejectedValue({
      name: 'XiorError',
      response: { data: {}, status: 404 },
    })

    renderItemDetail()

    expect(
      await screen.findByRole('heading', {
        name: 'Nothing can be opened here.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument()
  })
})
