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

import {
  ArchiveFeatureEntry,
  TrashFeatureEntry,
} from '../src/features/collections/collection-feature-entry'

const { getApi, postApi } = vi.hoisted(() => ({
  getApi: vi.fn(),
  postApi: vi.fn(),
}))

vi.mock('../src/lib/api-client', () => ({
  apiClient: {
    get: getApi,
    post: postApi,
  },
}))

const createdAt = '2026-08-08T08:30:00.000Z'
const itemId = '11111111-1111-4111-8111-111111111111'

function createItem(overrides: Partial<ItemView> = {}): ItemView {
  return {
    authoredTitle: 'Archived thought',
    createdAt,
    displayTitle: 'Archived thought',
    id: itemId,
    kind: 'note',
    noteMarkdown: 'Keep this for later.',
    originalUrl: null,
    pinnedAt: null,
    status: 'archived',
    tags: [],
    trashedAt: null,
    updatedAt: createdAt,
    version: 2,
    ...overrides,
  }
}

function createPage(
  items: ItemView[],
  nextCursor: string | null = null,
): ItemPage {
  return { items, nextCursor }
}

function renderCollection(kind: 'archive' | 'trash') {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const rootRoute = createRootRoute({ component: Outlet })
  const route = createRoute({
    component: kind === 'archive' ? ArchiveFeatureEntry : TrashFeatureEntry,
    getParentRoute: () => rootRoute,
    path: kind === 'archive' ? '/archive' : '/trash',
  })
  const itemRoute = createRoute({
    component: () => null,
    getParentRoute: () => rootRoute,
    path: '/items/$itemId',
  })
  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: [kind === 'archive' ? '/archive' : '/trash'],
    }),
    routeTree: rootRoute.addChildren([route, itemRoute]),
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

describe('Archive and Trash collections', () => {
  it('lists archived Items and restores them', async () => {
    getApi.mockImplementation(() =>
      Promise.resolve({ data: createPage([createItem()]) }),
    )
    postApi.mockImplementation(() =>
      Promise.resolve({
        data: createItem({ status: 'library', version: 3 }),
      }),
    )

    renderCollection('archive')

    expect(
      await screen.findByRole('heading', { name: 'Archived thought' }),
    ).toBeInTheDocument()
    expect(getApi).toHaveBeenCalledWith('/items', {
      params: {
        cursor: undefined,
        limit: 5,
        sort: 'created_desc',
        status: 'archived',
      },
    })
    expect(screen.getByRole('heading', { name: 'Archive' })).toBeInTheDocument()
    expect(screen.queryByText('Lifecycle')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Archived Items stay out of the default Library/i),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restore to Library' }))

    await waitFor(() => {
      expect(postApi).toHaveBeenCalledWith(`/items/${itemId}/actions`, {
        expectedVersion: 2,
        type: 'restore',
      })
    })
  })

  it('requires confirmation before permanent deletion', async () => {
    getApi.mockImplementation(() =>
      Promise.resolve({
        data: createPage([
          createItem({
            status: 'trashed',
            trashedAt: createdAt,
            version: 3,
          }),
        ]),
      }),
    )
    postApi.mockImplementation(() =>
      Promise.resolve({ data: null, status: 204 }),
    )

    renderCollection('trash')

    expect(
      await screen.findByRole('heading', { name: 'Archived thought' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Lifecycle')).not.toBeInTheDocument()
    expect(screen.queryByText(/kept for thirty days/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm permanent delete' }),
    )

    await waitFor(() => {
      expect(postApi).toHaveBeenCalledWith(`/items/${itemId}/actions`, {
        confirm: true,
        expectedVersion: 3,
        type: 'delete_permanently',
      })
    })
  })

  it('does not show pagination for an empty collection', async () => {
    getApi.mockResolvedValue({ data: createPage([]) })

    renderCollection('archive')

    expect(await screen.findByText('Archive is empty.')).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Archive pagination' }),
    ).not.toBeInTheDocument()
  })

  it('uses the shared pagination control for collection pages', async () => {
    const secondItem = createItem({
      displayTitle: 'Older archived thought',
      id: '33333333-3333-4333-8333-333333333333',
    })
    getApi.mockImplementation(
      (_path: string, options?: { params?: { cursor?: string } }) => {
        if (options?.params?.cursor === 'older-items') {
          return Promise.resolve({ data: createPage([secondItem]) })
        }
        return Promise.resolve({
          data: createPage([createItem()], 'older-items'),
        })
      },
    )

    renderCollection('archive')
    fireEvent.click(
      await screen.findByRole('button', { name: 'Next Archive page' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Older archived thought' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Archived thought' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('2')).toHaveClass('size-10', 'rounded-full')
    expect(screen.getByText('2')).not.toHaveClass('min-w-20')
    expect(getApi).toHaveBeenCalledWith('/items', {
      params: {
        cursor: 'older-items',
        limit: 5,
        sort: 'created_desc',
        status: 'archived',
      },
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Previous Archive page' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Archived thought' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Older archived thought' }),
    ).not.toBeInTheDocument()
  })
})
