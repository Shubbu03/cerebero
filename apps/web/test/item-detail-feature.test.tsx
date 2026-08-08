import type { ItemView } from '@cerebero/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ItemDetailFeatureEntry } from '../src/features/items/item-detail-feature-entry'

const { getApi, postApi } = vi.hoisted(() => ({
  getApi: vi.fn(),
  postApi: vi.fn(),
}))

vi.mock('../src/lib/api-client', () => ({
  apiClient: { get: getApi, post: postApi },
}))

const itemId = '11111111-1111-4111-8111-111111111111'
const createdAt = '2026-08-08T08:30:00.000Z'

function createItem(overrides: Partial<ItemView> = {}): ItemView {
  return {
    authoredTitle: 'A useful reference',
    createdAt,
    displayTitle: 'A useful reference',
    enrichment: {
      attemptCount: 1,
      canonicalUrl: 'https://example.com/reference',
      description: 'A concise extracted description.',
      enrichedAt: '2026-08-08T08:31:00.000Z',
      extractedTitle: 'Reference',
      faviconUrl: null,
      imageUrl: null,
      lastErrorCode: null,
      nextAttemptAt: null,
      provider: null,
      siteName: 'Example',
      state: 'succeeded',
    },
    id: itemId,
    kind: 'link',
    noteMarkdown: 'Read this before planning the next release.',
    originalUrl: 'https://example.com/reference',
    pinnedAt: null,
    status: 'inbox',
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
  const inboxRoute = createRoute({
    component: () => null,
    getParentRoute: () => rootRoute,
    path: '/inbox',
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
    routeTree: rootRoute.addChildren([inboxRoute, itemRoute]),
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
  postApi.mockReset()
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

  it('renders validated authored and derived data strictly as text', async () => {
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
      screen.getByText('A concise extracted description.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Source details are ready.')).toBeInTheDocument()
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

  it('files the current Item with its loaded version', async () => {
    const item = createItem()
    const filedItem = {
      ...item,
      status: 'library' as const,
      updatedAt: '2026-08-08T09:00:00.000Z',
      version: 2,
    }
    getApi.mockResolvedValue({ data: item })
    postApi.mockResolvedValue({ data: filedItem })
    renderItemDetail()

    fireEvent.click(
      await screen.findByRole('button', { name: 'File to Library' }),
    )

    expect(await screen.findByText('Filed to Library.')).toBeInTheDocument()
    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'File to Library' }),
    ).not.toBeInTheDocument()
    expect(postApi).toHaveBeenCalledWith(`/items/${item.id}/actions`, {
      expectedVersion: 1,
      type: 'file',
    })
  })

  it('keeps the Item visible when filing fails', async () => {
    const item = createItem()
    getApi.mockResolvedValue({ data: item })
    postApi.mockRejectedValue(new Error('database unavailable'))
    renderItemDetail()

    fireEvent.click(
      await screen.findByRole('button', { name: 'File to Library' }),
    )

    expect(
      await screen.findByText(
        'The Item could not be filed. Refresh and try again.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'A useful reference' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'File to Library' }),
    ).toBeEnabled()
  })
})
