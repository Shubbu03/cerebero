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
import { inboxItemsQueryKey } from '../src/features/inbox/data-access/inbox-items-query-key'

const { postApi } = vi.hoisted(() => ({ postApi: vi.fn() }))

vi.mock('../src/lib/api-client', () => ({
  apiClient: { post: postApi },
}))

const createdAt = '2026-08-08T08:30:00.000Z'

function createItem(overrides: Partial<ItemView> = {}): ItemView {
  return {
    authoredTitle: 'A useful reference',
    createdAt,
    displayTitle: 'A useful reference',
    enrichment: {
      attemptCount: 0,
      canonicalUrl: null,
      description: null,
      enrichedAt: null,
      extractedTitle: null,
      faviconUrl: null,
      imageUrl: null,
      lastErrorCode: null,
      nextAttemptAt: '2026-08-08T08:30:01.000Z',
      provider: null,
      siteName: null,
      state: 'pending',
    },
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'link',
    noteMarkdown: null,
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

function renderCapture() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const initialPage: ItemPage = { items: [], nextCursor: null }
  queryClient.setQueryData(inboxItemsQueryKey, {
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
  postApi.mockReset()
})

describe('Capture feature', () => {
  it('validates that the draft contains a URL or note', async () => {
    renderCapture()
    await openCapture()

    fireEvent.click(screen.getByRole('button', { name: 'Capture to Inbox' }))

    expect(
      await screen.findByText('Add a URL or write a note.'),
    ).toBeInTheDocument()
    expect(postApi).not.toHaveBeenCalled()
  })

  it('persists a Capture and inserts the confirmed Item into the Inbox cache', async () => {
    const item = createItem()
    postApi.mockResolvedValue({ data: item })
    const queryClient = renderCapture()
    await openCapture()

    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'https://example.com/reference' },
    })
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: '  A useful reference  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Capture to Inbox' }))

    expect(
      await screen.findByText(
        'Captured to Inbox. Source details may still be loading.',
      ),
    ).toBeInTheDocument()
    expect(postApi).toHaveBeenCalledWith('/items', {
      allowDuplicate: false,
      authoredTitle: 'A useful reference',
      noteMarkdown: null,
      originalUrl: 'https://example.com/reference',
    })

    const cached = queryClient.getQueryData<{
      pages: ItemPage[]
    }>(inboxItemsQueryKey)
    expect(cached?.pages[0]?.items[0]).toEqual(item)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the draft when a transport failure is recoverable', async () => {
    postApi.mockRejectedValue(new Error('network unavailable'))
    renderCapture()
    await openCapture()

    const note = screen.getByLabelText('Note')
    fireEvent.change(note, { target: { value: 'A thought worth keeping.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Capture to Inbox' }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Capture to Inbox' }))

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
    expect(
      await screen.findByText(
        'Captured to Inbox. Source details may still be loading.',
      ),
    ).toBeInTheDocument()
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
