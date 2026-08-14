import type {
  DuplicateCandidate,
  ExtensionSession,
  ItemView,
} from '@cerebero/contracts'
import { describe, expect, it, vi } from 'vitest'

import type {
  ExtensionAuthenticationStore,
  StoredExtensionAuthentication,
} from '../src/auth/auth-types'
import { createCaptureController } from '../src/capture/capture-controller'
import type {
  CapturePage,
  PendingCapture,
  PendingCaptureStore,
} from '../src/capture/capture-types'
import { ExtensionApiError } from '../src/lib/extension-api'

const PAGE: CapturePage = {
  title: 'Useful page',
  url: 'https://example.com/article',
}

const SESSION: ExtensionSession = {
  expiresAt: '2026-09-14T00:00:00.000Z',
  id: '00000000-0000-4000-8000-000000000501',
  scopes: ['items:create', 'items:duplicates:check'],
  user: {
    email: 'person@example.com',
    emailVerified: true,
    id: 'user-1',
    image: null,
    name: 'Person',
  },
}

const ITEM: ItemView = {
  authoredTitle: PAGE.title,
  createdAt: '2026-08-14T00:00:00.000Z',
  displayTitle: PAGE.title ?? 'example.com',
  id: '00000000-0000-4000-8000-000000000502',
  kind: 'link',
  noteMarkdown: null,
  originalUrl: PAGE.url,
  pinnedAt: null,
  status: 'library',
  tags: [],
  trashedAt: null,
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
}

const DUPLICATE: DuplicateCandidate = {
  authoredTitle: ITEM.authoredTitle,
  createdAt: ITEM.createdAt,
  displayTitle: ITEM.displayTitle,
  id: ITEM.id,
  kind: ITEM.kind,
  originalUrl: ITEM.originalUrl,
  status: ITEM.status,
  updatedAt: ITEM.updatedAt,
}

function authenticationStore(
  initial: StoredExtensionAuthentication | null = {
    session: SESSION,
    status: 'authenticated',
    token: 'cer_ext_server_session_token',
  },
): ExtensionAuthenticationStore & {
  current: () => StoredExtensionAuthentication | null
} {
  let value = initial
  const clear: ExtensionAuthenticationStore['clear'] = () => {
    value = null
    return Promise.resolve()
  }
  const read: ExtensionAuthenticationStore['read'] = () =>
    Promise.resolve(value)
  const writeAuthenticated: ExtensionAuthenticationStore['writeAuthenticated'] =
    (record) => {
      value = record
      return Promise.resolve()
    }
  const writeExpired: ExtensionAuthenticationStore['writeExpired'] = (
    session,
  ) => {
    value = { session, status: 'expired' }
    return Promise.resolve()
  }
  return {
    clear: vi.fn(clear),
    current: () => value,
    read: vi.fn(read),
    writeAuthenticated: vi.fn(writeAuthenticated),
    writeExpired: vi.fn(writeExpired),
  }
}

function pendingStore(initial: PendingCapture | null = null) {
  let value = initial
  const clear: PendingCaptureStore['clear'] = () => {
    value = null
    return Promise.resolve()
  }
  const read: PendingCaptureStore['read'] = () => Promise.resolve(value)
  const write: PendingCaptureStore['write'] = (page) => {
    const pending: PendingCapture = {
      ...page,
      createdAt: '2026-08-14T00:00:00.000Z',
      id: '00000000-0000-4000-8000-000000000503',
    }
    value = pending
    return Promise.resolve(pending)
  }
  const store: PendingCaptureStore & { current: () => PendingCapture | null } =
    {
      clear: vi.fn(clear),
      current: () => value,
      read: vi.fn(read),
      write: vi.fn(write),
    }
  return store
}

function captureApi(options?: { duplicates?: DuplicateCandidate[] }) {
  return {
    capture: vi.fn().mockResolvedValue({ item: ITEM, outcome: 'captured' }),
    checkDuplicates: vi.fn().mockResolvedValue(options?.duplicates ?? []),
  }
}

describe('Extension Capture controller', () => {
  it('prefers the one pending context-menu Capture over the active page', async () => {
    const pending = pendingStore({
      ...PAGE,
      createdAt: '2026-08-14T00:00:00.000Z',
      id: '00000000-0000-4000-8000-000000000503',
    })
    const controller = createCaptureController({
      api: captureApi(),
      authenticationStore: authenticationStore(),
      pendingStore: pending,
    })

    await expect(
      controller.getDraft({
        title: 'Different page',
        url: 'https://other.example.com',
      }),
    ).resolves.toEqual({
      draft: {
        pendingCaptureId: '00000000-0000-4000-8000-000000000503',
        source: 'pending-context-menu',
        ...PAGE,
      },
      status: 'ready',
    })
  })

  it('preserves a signed-out Quick Capture for explicit confirmation', async () => {
    const pending = pendingStore()
    const api = captureApi()
    const controller = createCaptureController({
      api,
      authenticationStore: authenticationStore(null),
      pendingStore: pending,
    })

    await expect(controller.captureQuick(PAGE)).resolves.toEqual({
      status: 'authentication-required',
    })
    expect(pending.current()).toMatchObject(PAGE)
    expect(api.checkDuplicates).not.toHaveBeenCalled()
    expect(api.capture).not.toHaveBeenCalled()
  })

  it('never creates an unchecked duplicate from Quick Capture', async () => {
    const api = captureApi({ duplicates: [DUPLICATE] })
    const controller = createCaptureController({
      api,
      authenticationStore: authenticationStore(),
      pendingStore: pendingStore(),
    })

    await expect(controller.captureQuick(PAGE)).resolves.toEqual({
      candidates: [DUPLICATE],
      status: 'duplicate',
    })
    expect(api.capture).not.toHaveBeenCalled()
  })

  it('lets reviewed Capture deliberately save another copy after detection', async () => {
    const api = captureApi({ duplicates: [DUPLICATE] })
    const controller = createCaptureController({
      api,
      authenticationStore: authenticationStore(),
      pendingStore: pendingStore(),
    })
    const input = {
      allowDuplicate: false,
      authoredTitle: PAGE.title,
      noteMarkdown: 'Worth revisiting.',
      originalUrl: PAGE.url,
      pendingCaptureId: null,
    }

    await expect(controller.captureReviewed(input)).resolves.toMatchObject({
      status: 'duplicate',
    })
    await expect(
      controller.captureReviewed({ ...input, allowDuplicate: true }),
    ).resolves.toEqual({ item: ITEM, status: 'captured' })
    expect(api.capture).toHaveBeenCalledWith(
      'cer_ext_server_session_token',
      expect.objectContaining({ allowDuplicate: true }),
    )
  })

  it('clears the matching pending Capture only after persistence succeeds', async () => {
    const pending = pendingStore({
      ...PAGE,
      createdAt: '2026-08-14T00:00:00.000Z',
      id: '00000000-0000-4000-8000-000000000503',
    })
    const controller = createCaptureController({
      api: captureApi(),
      authenticationStore: authenticationStore(),
      pendingStore: pending,
    })

    await expect(
      controller.captureReviewed({
        allowDuplicate: false,
        authoredTitle: PAGE.title,
        noteMarkdown: null,
        originalUrl: PAGE.url,
        pendingCaptureId: '00000000-0000-4000-8000-000000000503',
      }),
    ).resolves.toEqual({ item: ITEM, status: 'captured' })
    expect(pending.current()).toBeNull()
  })

  it('returns an honest recoverable network failure', async () => {
    const api = captureApi()
    api.checkDuplicates.mockRejectedValue(
      new ExtensionApiError('network', 'Offline.'),
    )
    const controller = createCaptureController({
      api,
      authenticationStore: authenticationStore(),
      pendingStore: pendingStore(),
    })

    await expect(controller.captureQuick(PAGE)).resolves.toEqual({
      code: 'network',
      message: 'Cerebero could not be reached. Check your connection.',
      status: 'failed',
    })
  })

  it('deduplicates repeated in-flight Quick Capture clicks', async () => {
    let finishCheck: ((value: DuplicateCandidate[]) => void) | undefined
    const api = captureApi()
    api.checkDuplicates.mockImplementation(
      () =>
        new Promise<DuplicateCandidate[]>((resolve) => {
          finishCheck = resolve
        }),
    )
    const controller = createCaptureController({
      api,
      authenticationStore: authenticationStore(),
      pendingStore: pendingStore(),
    })

    const first = controller.captureQuick(PAGE)
    const second = controller.captureQuick(PAGE)
    await vi.waitFor(() => expect(api.checkDuplicates).toHaveBeenCalledOnce())
    finishCheck?.([])

    await expect(Promise.all([first, second])).resolves.toEqual([
      { item: ITEM, status: 'captured' },
      { item: ITEM, status: 'captured' },
    ])
    expect(api.checkDuplicates).toHaveBeenCalledOnce()
    expect(api.capture).toHaveBeenCalledOnce()
  })

  it('expires a revoked session and preserves Quick Capture for sign-in', async () => {
    const auth = authenticationStore()
    const pending = pendingStore()
    const api = captureApi()
    api.checkDuplicates.mockRejectedValue(
      new ExtensionApiError('UNAUTHENTICATED', 'Session revoked.'),
    )
    const controller = createCaptureController({
      api,
      authenticationStore: auth,
      pendingStore: pending,
    })

    await expect(controller.captureQuick(PAGE)).resolves.toEqual({
      status: 'authentication-required',
    })
    expect(auth.current()).toEqual({ session: SESSION, status: 'expired' })
    expect(pending.current()).toMatchObject(PAGE)
  })
})
