import type { ItemPage, ItemView } from '@cerebero/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CaptureFeatureEntry } from '../src/features/capture/capture-feature-entry'
import {
  defaultLibraryListFilters,
  libraryItemsQueryKey,
} from '../src/features/library/data-access/library-items-query-key'
import { useLibraryItemsQuery } from '../src/features/library/data-access/use-library-items-query'

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
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'link',
    noteMarkdown: null,
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

function LibraryPageAvailability() {
  const query = useLibraryItemsQuery(defaultLibraryListFilters)

  return (
    <output>
      {query.hasNextPage ? 'Next page available' : 'No next page'}
    </output>
  )
}

function renderCapture({
  initialPage = { items: [], nextCursor: null },
  observeLibrary = false,
}: {
  initialPage?: ItemPage
  observeLibrary?: boolean
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: Infinity },
    },
  })
  queryClient.setQueryData(libraryItemsQueryKey(defaultLibraryListFilters), {
    pageParams: [null],
    pages: [initialPage],
  })

  render(
    <QueryClientProvider client={queryClient}>
      <CaptureFeatureEntry>
        {({ openCapture }) => (
          <button onClick={openCapture} type="button">
            Open Capture
          </button>
        )}
      </CaptureFeatureEntry>
      {observeLibrary ? <LibraryPageAvailability /> : null}
    </QueryClientProvider>,
  )

  return queryClient
}

async function openCapture() {
  fireEvent.click(screen.getByRole('button', { name: 'Open Capture' }))
  await screen.findByRole('dialog')
}

afterEach(() => {
  cleanup()
  getApi.mockReset()
  postApi.mockReset()
})

describe('Capture feature', () => {
  it('validates that the draft contains a URL or note', async () => {
    renderCapture()
    await openCapture()

    expect(screen.getByLabelText('URL')).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Save to Library' }))

    expect(
      await screen.findByText('Add a URL or write a note.'),
    ).toBeInTheDocument()
    expect(postApi).not.toHaveBeenCalled()
  })

  it('persists a Capture and inserts the confirmed Item into the Library cache', async () => {
    const item = createItem()
    postApi.mockResolvedValue({ data: item })
    const queryClient = renderCapture()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    await openCapture()

    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'https://example.com/reference' },
    })
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: '  A useful reference  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save to Library' }))

    expect(await screen.findByText('Saved to Library.')).toBeInTheDocument()
    expect(postApi).toHaveBeenCalledWith('/items', {
      allowDuplicate: false,
      authoredTitle: 'A useful reference',
      noteMarkdown: null,
      originalUrl: 'https://example.com/reference',
    })

    const cached = queryClient.getQueryData<{
      pages: ItemPage[]
    }>(libraryItemsQueryKey(defaultLibraryListFilters))
    expect(cached?.pages[0]?.items[0]).toEqual(item)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['items', 'library'],
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('saves with Enter from a single-line capture field', async () => {
    const item = createItem()
    postApi.mockResolvedValue({ data: item })
    renderCapture()
    await openCapture()

    const url = screen.getByLabelText('URL')
    fireEvent.change(url, { target: { value: item.originalUrl } })
    fireEvent.keyDown(url, { key: 'Enter' })

    expect(await screen.findByText('Saved to Library.')).toBeInTheDocument()
    expect(postApi).toHaveBeenCalledTimes(1)
  })

  it('saves with S outside editable fields without hijacking typed text', async () => {
    const item = createItem()
    postApi.mockResolvedValue({ data: item })
    renderCapture()
    await openCapture()

    const url = screen.getByLabelText('URL')
    fireEvent.change(url, { target: { value: item.originalUrl } })
    fireEvent.keyDown(url, { key: 's' })
    expect(postApi).not.toHaveBeenCalled()

    const closeButton = screen.getByRole('button', { name: 'Close Capture' })
    closeButton.focus()
    fireEvent.keyDown(closeButton, { key: 's' })

    expect(await screen.findByText('Saved to Library.')).toBeInTheDocument()
    expect(postApi).toHaveBeenCalledTimes(1)
  })

  it('shows a pending Library Item before the remote Capture finishes', async () => {
    const item = createItem()
    let finishRequest: ((response: { data: ItemView }) => void) | undefined
    postApi.mockReturnValue(
      new Promise<{ data: ItemView }>((resolve) => {
        finishRequest = resolve
      }),
    )
    const queryClient = renderCapture()
    await openCapture()

    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: item.originalUrl },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save to Library' }))

    await waitFor(() => {
      const cached = queryClient.getQueryData<{
        pages: Array<{ items: Array<ItemView & { clientState?: string }> }>
      }>(libraryItemsQueryKey(defaultLibraryListFilters))
      expect(cached?.pages[0]?.items[0]?.clientState).toBe('saving')
    })

    finishRequest?.({ data: item })
    expect(await screen.findByText('Saved to Library.')).toBeInTheDocument()
    const confirmed = queryClient.getQueryData<{
      pages: Array<{ items: ItemView[] }>
    }>(libraryItemsQueryKey(defaultLibraryListFilters))
    expect(confirmed?.pages[0]?.items[0]).toEqual(item)
  })

  it('refetches a full first page after capture so displaced Items remain reachable', async () => {
    const existingItems = Array.from({ length: 5 }, (_, index) =>
      createItem({
        displayTitle: `Existing Item ${index + 1}`,
        id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
      }),
    )
    const capturedItem = createItem({
      displayTitle: 'Newest Item',
      id: '33333333-3333-4333-8333-333333333333',
      originalUrl: 'https://example.com/newest',
    })
    postApi.mockResolvedValue({ data: capturedItem })
    getApi.mockResolvedValue({
      data: {
        items: [capturedItem, ...existingItems.slice(0, 4)],
        nextCursor: 'next-page',
      } satisfies ItemPage,
    })
    renderCapture({
      initialPage: { items: existingItems, nextCursor: null },
      observeLibrary: true,
    })
    await openCapture()

    expect(screen.getByText('No next page')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: capturedItem.originalUrl },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save to Library' }))

    expect(await screen.findByText('Saved to Library.')).toBeInTheDocument()
    expect(await screen.findByText('Next page available')).toBeInTheDocument()
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

  it('keeps the draft when a transport failure is recoverable', async () => {
    postApi.mockRejectedValue(new Error('network unavailable'))
    renderCapture()
    await openCapture()

    const note = screen.getByLabelText('Note')
    fireEvent.change(note, { target: { value: 'A thought worth keeping.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save to Library' }))

    expect(
      await screen.findByText('Capture could not be completed. Try again.'),
    ).toBeInTheDocument()
    expect(note).toHaveValue('A thought worth keeping.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('requires explicit confirmation before saving a duplicate URL', async () => {
    const item = createItem()
    postApi
      .mockRejectedValueOnce({
        name: 'XiorError',
        response: {
          data: {
            candidates: [
              {
                authoredTitle: item.authoredTitle,
                createdAt: item.createdAt,
                displayTitle: item.displayTitle,
                id: item.id,
                kind: item.kind,
                originalUrl: item.originalUrl,
                status: item.status,
                updatedAt: item.updatedAt,
              },
            ],
            error: {
              code: 'DUPLICATE_ITEM',
              message: 'A matching URL already exists.',
              requestId: 'request-1',
            },
          },
          status: 409,
        },
      })
      .mockResolvedValueOnce({ data: item })
    renderCapture()
    await openCapture()

    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: item.originalUrl },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save to Library' }))

    expect(
      await screen.findByRole('heading', {
        name: 'This link is already in your collection.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(item.displayTitle)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save another copy' }))

    await waitFor(() => expect(postApi).toHaveBeenCalledTimes(2))
    expect(postApi).toHaveBeenLastCalledWith('/items', {
      allowDuplicate: true,
      authoredTitle: null,
      noteMarkdown: null,
      originalUrl: item.originalUrl,
    })
    expect(await screen.findByText('Saved to Library.')).toBeInTheDocument()
  })

  it('opens with C except while focus is inside an editable field', async () => {
    renderCapture()

    fireEvent.keyDown(document, { key: 'c' })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close Capture' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    const editable = document.createElement('input')
    document.body.append(editable)
    editable.focus()
    fireEvent.keyDown(editable, { key: 'c' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    editable.remove()
  })
})
