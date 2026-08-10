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
  within,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ItemDetailFeatureEntry } from '../src/features/items/item-detail-feature-entry'
import {
  defaultLibraryListFilters,
  libraryItemsQueryKey,
} from '../src/features/library/data-access/library-items-query-key'

const { getApi, patchApi, postApi, putApi, deleteApi } = vi.hoisted(() => ({
  deleteApi: vi.fn(),
  getApi: vi.fn(),
  patchApi: vi.fn(),
  postApi: vi.fn(),
  putApi: vi.fn(),
}))

vi.mock('../src/lib/api-client', () => ({
  apiClient: {
    delete: deleteApi,
    get: getApi,
    patch: patchApi,
    post: postApi,
    put: putApi,
  },
}))

const itemId = '11111111-1111-4111-8111-111111111111'
const tagId = '22222222-2222-4222-8222-222222222222'
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

function createTagList(): TagList {
  return {
    tags: [{ createdAt, id: tagId, name: 'Research' }],
  }
}

function renderItemDetail(routeItemId = itemId, cachedItem?: ItemView) {
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

  if (cachedItem) {
    queryClient.setQueryData(libraryItemsQueryKey(defaultLibraryListFilters), {
      pageParams: [null],
      pages: [{ items: [cachedItem], nextCursor: null } satisfies ItemPage],
    })
  }

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  }
}

afterEach(() => {
  cleanup()
  getApi.mockReset()
  patchApi.mockReset()
  postApi.mockReset()
  putApi.mockReset()
  deleteApi.mockReset()
})

describe('Item detail feature', () => {
  it('opens immediately from a cached Library Item without another item request', async () => {
    const item = createItem()
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      throw new Error(`Unexpected request: ${path}`)
    })

    renderItemDetail(item.id, item)

    expect(
      await screen.findByRole('heading', { name: item.displayTitle }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Item details')).toHaveClass(
      'w-full',
      'px-4',
      'lg:px-8',
    )
    expect(screen.getByLabelText('Item details')).not.toHaveClass(
      'mx-auto',
      'max-w-6xl',
    )
    expect(screen.getByRole('region', { name: 'Source' })).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', {
        name: 'Item organization and sharing',
      }),
    ).toBeInTheDocument()
    const detailHeader = screen
      .getByRole('heading', { name: item.displayTitle })
      .closest('header')
    expect(detailHeader).toHaveClass('mt-4', 'sm:mt-5')
    expect(
      within(detailHeader as HTMLElement).queryByText('Link'),
    ).not.toBeInTheDocument()
    expect(
      within(detailHeader as HTMLElement).queryByText('Library'),
    ).not.toBeInTheDocument()

    const tagSelect = await screen.findByLabelText('Attach existing Tag')
    expect(tagSelect).toHaveClass('appearance-none', 'leading-none', 'pr-10')
    expect(tagSelect.parentElement?.querySelector('svg')).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: '#Research' }),
    ).toBeInTheDocument()
    expect(getApi).not.toHaveBeenCalledWith(`/items/${item.id}`)
  })

  it('rejects an invalid route ID without crossing the API boundary', async () => {
    renderItemDetail('not-an-item-id')

    expect(
      await screen.findByRole('heading', {
        name: 'Nothing can be opened here.',
      }),
    ).toBeInTheDocument()
    expect(getApi).not.toHaveBeenCalled()
  })

  it('renders Markdown while dropping hostile HTML, scripts, images, and URLs', async () => {
    const unsafeLookingNote = [
      '# Safe heading',
      '[Useful source](https://example.com/useful)',
      '[Unsafe source](javascript:alert(1))',
      '![Tracking pixel](https://tracker.example/pixel.gif)',
      '<script>alert("no")</script>',
    ].join('\n\n')
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: createItem({ noteMarkdown: unsafeLookingNote }) }
    })

    const { container } = renderItemDetail()

    expect(
      await screen.findByRole('heading', { name: 'A useful reference' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Safe heading' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Useful source/ })).toHaveAttribute(
      'href',
      'https://example.com/useful',
    )
    expect(
      screen.queryByRole('link', { name: /Unsafe source/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Unsafe source')).toBeInTheDocument()
    expect(
      screen.getByText('[Image omitted: Tracking pixel]'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('https://example.com/reference'),
    ).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('previews Markdown without replacing the editable source', async () => {
    const item = createItem()
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: item }
    })
    patchApi.mockResolvedValue({
      data: createItem({ noteMarkdown: '# Preview heading', version: 2 }),
    })

    renderItemDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const noteField = screen.getByLabelText('Note')
    fireEvent.change(noteField, { target: { value: '# Preview heading' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(
      screen.getByRole('heading', { level: 2, name: 'Preview heading' }),
    ).toBeInTheDocument()
    expect(noteField).toHaveValue('# Preview heading')

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => {
      expect(patchApi).toHaveBeenCalledWith(`/items/${itemId}`, {
        authoredTitle: item.authoredTitle,
        expectedVersion: 1,
        noteMarkdown: '# Preview heading',
        originalUrl: item.originalUrl,
      })
    })
  })

  it('uses the same ownership-neutral state for a missing Item', async () => {
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return Promise.resolve({ data: createTagList() })
      }
      const error = Object.assign(new Error('Not found'), {
        name: 'XiorError',
        response: { data: {}, status: 404 },
      })
      return Promise.reject(error)
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

  it('edits title, URL, and note with expectedVersion', async () => {
    const item = createItem()
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: item }
    })
    patchApi.mockResolvedValue({
      data: createItem({
        authoredTitle: 'Updated title',
        displayTitle: 'Updated title',
        noteMarkdown: 'Updated note',
        originalUrl: 'https://example.com/updated',
        version: 2,
      }),
    })

    renderItemDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Updated title' },
    })
    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'https://example.com/updated' },
    })
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Updated note' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(patchApi).toHaveBeenCalledWith(`/items/${itemId}`, {
        authoredTitle: 'Updated title',
        expectedVersion: 1,
        noteMarkdown: 'Updated note',
        originalUrl: 'https://example.com/updated',
      })
    })
    expect(
      await screen.findByRole('heading', { name: 'Updated title' }),
    ).toBeInTheDocument()
  })

  it('surfaces version conflicts without overwriting', async () => {
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: createItem() }
    })
    patchApi.mockRejectedValue({
      name: 'XiorError',
      response: {
        data: {
          error: {
            code: 'EDIT_CONFLICT',
            message:
              'The Item changed since it was loaded. Refresh and try again.',
            requestId: 'req-1',
          },
        },
        status: 409,
      },
    })

    renderItemDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Conflicted title' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('This Item changed elsewhere.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reload Item' }),
    ).toBeInTheDocument()
  })

  it('pins and unpins without a page reload', async () => {
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: createItem() }
    })
    postApi.mockResolvedValue({
      data: createItem({
        pinnedAt: '2026-08-08T09:00:00.000Z',
        version: 2,
      }),
    })

    renderItemDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Pin' }))

    await waitFor(() => {
      expect(postApi).toHaveBeenCalledWith(`/items/${itemId}/actions`, {
        expectedVersion: 1,
        type: 'pin',
      })
    })
    expect(
      await screen.findByRole('button', { name: 'Unpin' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Pinned').length).toBeGreaterThan(0)
  })

  it('archives and moves to Trash with confirmation', async () => {
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: createItem() }
    })
    postApi
      .mockResolvedValueOnce({
        data: createItem({ status: 'archived', version: 2 }),
      })
      .mockResolvedValueOnce({
        data: createItem({
          status: 'trashed',
          trashedAt: '2026-08-08T10:00:00.000Z',
          version: 3,
        }),
      })

    renderItemDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }))
    await waitFor(() => {
      expect(postApi).toHaveBeenCalledWith(`/items/${itemId}/actions`, {
        expectedVersion: 1,
        type: 'archive',
      })
    })
  })

  it('creates and attaches a Tag from Item detail', async () => {
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: createItem() }
    })
    const createdTag = {
      createdAt,
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Planning',
    }
    postApi.mockResolvedValue({ data: createdTag })
    putApi.mockResolvedValue({
      data: createItem({
        tags: [createdTag],
        version: 1,
      }),
    })

    renderItemDetail()
    const createTagInput = await screen.findByLabelText('Create and attach Tag')
    expect(createTagInput).toHaveAttribute('placeholder', 'tag-name')
    expect(createTagInput.parentElement).toHaveTextContent('#')
    fireEvent.change(createTagInput, {
      target: { value: '#Planning' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(postApi).toHaveBeenCalledWith('/tags', { name: 'Planning' })
      expect(putApi).toHaveBeenCalledWith(
        `/items/${itemId}/tags/${createdTag.id}`,
      )
    })
    expect(await screen.findByText('#Planning')).toBeInTheDocument()
  })

  it('detaches a Tag from an Item', async () => {
    const attached = {
      createdAt,
      id: tagId,
      name: 'Research',
    }
    getApi.mockImplementation((path: string) => {
      if (path === '/tags') {
        return { data: createTagList() }
      }
      return { data: createItem({ tags: [attached] }) }
    })
    deleteApi.mockResolvedValue({
      data: createItem({ tags: [], version: 1 }),
    })

    renderItemDetail()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Remove #Research' }),
    )

    await waitFor(() => {
      expect(deleteApi).toHaveBeenCalledWith(`/items/${itemId}/tags/${tagId}`)
    })
  })
})
