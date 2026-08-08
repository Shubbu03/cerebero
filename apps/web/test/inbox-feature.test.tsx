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

import { InboxFeatureEntry } from '../src/features/inbox/inbox-feature-entry'

const { getApi, postApi } = vi.hoisted(() => ({
  getApi: vi.fn(),
  postApi: vi.fn(),
}))

vi.mock('../src/lib/api-client', () => ({
  apiClient: { get: getApi, post: postApi },
}))

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
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'link',
    noteMarkdown: 'Read this before planning the next release.',
    originalUrl: 'https://example.com/reference',
    pinnedAt: null,
    status: 'inbox',
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

function createPage(
  items: ItemView[],
  nextCursor: string | null = null,
): ItemPage {
  return { items, nextCursor }
}

function renderInbox() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const rootRoute = createRootRoute()
  const inboxRoute = createRoute({
    component: InboxFeatureEntry,
    getParentRoute: () => rootRoute,
    path: '/inbox',
  })
  const itemRoute = createRoute({
    component: () => null,
    getParentRoute: () => rootRoute,
    path: '/items/$itemId',
  })
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/inbox'] }),
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

describe('Inbox data feature', () => {
  it('keeps the final list geometry while the first page loads', async () => {
    getApi.mockReturnValue(new Promise(() => undefined))

    renderInbox()

    expect(
      await screen.findByRole('heading', { name: 'Inbox' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('status', { name: 'Loading Inbox Items' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Loading Inbox')).toBeInTheDocument()
  })

  it('renders the screen-specific empty state', async () => {
    getApi.mockResolvedValue({ data: createPage([]) })

    renderInbox()

    expect(
      await screen.findByRole('heading', {
        name: 'Nothing waiting for review.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Inbox clear')).toBeInTheDocument()
  })

  it('renders validated Item data as text without loading remote images', async () => {
    const unsafeLookingNote = 'Keep <script>alert("no")</script> as plain text.'
    getApi.mockResolvedValue({
      data: createPage([createItem({ noteMarkdown: unsafeLookingNote })]),
    })

    const { container } = renderInbox()

    expect(
      await screen.findByRole('heading', { name: 'A useful reference' }),
    ).toBeInTheDocument()
    expect(screen.getByText(unsafeLookingNote)).toBeInTheDocument()
    expect(screen.getByText('Research')).toBeInTheDocument()
    expect(screen.getByText('Details ready')).toBeInTheDocument()
    expect(screen.getByText('1 waiting')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'A useful reference' }),
    ).toHaveAttribute('href', '/items/11111111-1111-4111-8111-111111111111')
    expect(
      screen.getByRole('link', { name: /example\.com.*opens in a new tab/i }),
    ).toHaveAttribute('href', 'https://example.com/reference')
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('turns invalid API data into a recoverable error state', async () => {
    getApi
      .mockResolvedValueOnce({ data: { items: [{ id: 'not-an-item' }] } })
      .mockResolvedValueOnce({ data: createPage([]) })

    renderInbox()

    expect(
      await screen.findByRole('heading', {
        name: 'Your Inbox could not be opened.',
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Nothing waiting for review.',
      }),
    ).toBeInTheDocument()
    expect(getApi).toHaveBeenCalledTimes(2)
  })

  it('loads the next cursor without replacing the first page', async () => {
    const secondItem = createItem({
      authoredTitle: null,
      displayTitle: 'A second Item',
      id: '33333333-3333-4333-8333-333333333333',
      kind: 'note',
      noteMarkdown: 'A private note.',
      originalUrl: null,
    })
    getApi
      .mockResolvedValueOnce({ data: createPage([createItem()], 'next-page') })
      .mockResolvedValueOnce({ data: createPage([secondItem]) })

    renderInbox()

    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }))

    expect(
      await screen.findByRole('heading', { name: 'A second Item' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'A useful reference' }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(getApi).toHaveBeenLastCalledWith('/items', {
        params: { cursor: 'next-page', limit: 25, status: 'inbox' },
      })
    })
  })

  it('files a confirmed Item and removes it from the Inbox', async () => {
    const item = createItem()
    const filedItem = {
      ...item,
      status: 'library' as const,
      updatedAt: '2026-08-08T09:00:00.000Z',
      version: 2,
    }
    getApi
      .mockResolvedValueOnce({ data: createPage([item]) })
      .mockResolvedValueOnce({ data: createPage([]) })
    postApi.mockResolvedValue({ data: filedItem })

    renderInbox()

    fireEvent.click(
      await screen.findByRole('button', { name: 'File to Library' }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Nothing waiting for review.',
      }),
    ).toBeInTheDocument()
    expect(postApi).toHaveBeenCalledWith(`/items/${item.id}/actions`, {
      expectedVersion: 1,
      type: 'file',
    })
  })
})
