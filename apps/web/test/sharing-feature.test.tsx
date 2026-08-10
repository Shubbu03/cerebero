import type {
  ItemView,
  ShareLinkCreated,
  ShareLinkStatus,
} from '@cerebero/contracts'
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

import { ItemDetailFeatureEntry } from '../src/features/items/item-detail-feature-entry'
import { PublicSharedFeatureEntry } from '../src/features/sharing/public-shared-feature-entry'

const { getApi, postApi, deleteApi } = vi.hoisted(() => ({
  deleteApi: vi.fn(),
  getApi: vi.fn(),
  postApi: vi.fn(),
}))

vi.mock('../src/lib/api-client', () => ({
  apiClient: {
    delete: deleteApi,
    get: getApi,
    post: postApi,
  },
}))

const itemId = '11111111-1111-4111-8111-111111111111'
const createdAt = '2026-08-08T08:30:00.000Z'
const token = 'a'.repeat(40)

function createItem(overrides: Partial<ItemView> = {}): ItemView {
  return {
    authoredTitle: 'Shared reference',
    createdAt,
    displayTitle: 'Shared reference',
    id: itemId,
    kind: 'link',
    noteMarkdown: 'A private note.',
    originalUrl: 'https://example.com/shared',
    pinnedAt: null,
    status: 'library',
    tags: [],
    trashedAt: null,
    updatedAt: createdAt,
    version: 1,
    ...overrides,
  }
}

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const rootRoute = createRootRoute({ component: Outlet })
  const libraryRoute = createRoute({
    component: () => null,
    getParentRoute: () => rootRoute,
    path: '/library',
  })
  const itemRoute = createRoute({
    component: () => <ItemDetailFeatureEntry itemId={itemId} />,
    getParentRoute: () => rootRoute,
    path: '/items/$itemId',
  })
  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: [`/items/${itemId}`],
    }),
    routeTree: rootRoute.addChildren([libraryRoute, itemRoute]),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function renderPublic(shareToken: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const rootRoute = createRootRoute({ component: Outlet })
  const landingRoute = createRoute({
    component: () => null,
    getParentRoute: () => rootRoute,
    path: '/',
  })
  const sharedRoute = createRoute({
    component: () => <PublicSharedFeatureEntry token={shareToken} />,
    getParentRoute: () => rootRoute,
    path: '/shared/$token',
  })
  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: [`/shared/${shareToken}`],
    }),
    routeTree: rootRoute.addChildren([landingRoute, sharedRoute]),
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
  deleteApi.mockReset()
})

describe('Sharing feature', () => {
  it('creates a Share Link and shows the public URL once', async () => {
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return Promise.resolve({ data: { tags: [] } })
      }
      if (path.endsWith('/share')) {
        return Promise.resolve({
          data: { active: false, createdAt: null } satisfies ShareLinkStatus,
        })
      }
      return Promise.resolve({ data: createItem() })
    })
    postApi.mockResolvedValue({
      data: {
        createdAt,
        itemId,
        token,
      } satisfies ShareLinkCreated,
    })

    renderDetail()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Create Share Link' }),
    )

    await waitFor(() => {
      expect(postApi).toHaveBeenCalledWith(`/items/${itemId}/share`)
    })
    expect(
      await screen.findByText(new RegExp(`/shared/${token}`)),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Copy link' }),
    ).toBeInTheDocument()
  })

  it('renders a neutral unavailable state for invalid public tokens', async () => {
    renderPublic('not-valid')

    expect(
      await screen.findByRole('heading', {
        name: 'This shared Item is unavailable.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(getApi).not.toHaveBeenCalled()
  })

  it('renders the public projection without private fields', async () => {
    getApi.mockResolvedValue({
      data: {
        authoredTitle: 'Shared reference',
        displayTitle: 'Shared reference',
        kind: 'link',
        noteMarkdown: 'Public note body',
        originalUrl: 'https://example.com/shared',
      },
    })

    renderPublic(token)

    expect(
      await screen.findByRole('heading', { name: 'Shared reference' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Public note body')).toBeInTheDocument()
    expect(screen.queryByText(/Pinned/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/version/i)).not.toBeInTheDocument()
  })

  it('uses the safe Markdown renderer for public notes', async () => {
    getApi.mockResolvedValue({
      data: {
        authoredTitle: 'Shared reference',
        displayTitle: 'Shared reference',
        kind: 'note',
        noteMarkdown:
          '# Public heading\n\n<script>alert(1)</script>\n\n![Remote image](https://tracker.example/pixel)',
        originalUrl: null,
      },
    })

    const { container } = renderPublic(token)

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Public heading',
      }),
    ).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(
      screen.getByText('[Image omitted: Remote image]'),
    ).toBeInTheDocument()
  })

  it('uses one unavailable state when public resolution fails', async () => {
    getApi.mockRejectedValue(
      Object.assign(new Error('missing'), {
        name: 'XiorError',
        response: { data: {}, status: 404 },
      }),
    )

    renderPublic(token)

    expect(
      await screen.findByRole('heading', {
        name: 'This shared Item is unavailable.',
      }),
    ).toBeInTheDocument()
  })
})
