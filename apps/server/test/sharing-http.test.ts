import { describe, expect, it, vi } from 'vitest'

import {
  apiErrorSchema,
  publicSharedItemSchema,
  shareLinkCreatedSchema,
  shareLinkStatusSchema,
} from '@cerebero/contracts'

import { createApp } from '../src/http/app.js'
import type { AppLogger } from '../src/infrastructure/logging/logger.js'
import type { ItemsModule } from '../src/modules/items/item-types.js'
import type { SharingModule } from '../src/modules/sharing/share-types.js'
import { SharingError } from '../src/modules/sharing/share-types.js'

const ITEM_ID = '00000000-0000-4000-8000-000000000001'
const TOKEN = 'public-share-token-00000000000000000001'

const AUTH_SESSION = {
  session: {
    expiresAt: '2026-08-13T00:00:00.000Z',
    id: 'session-1',
    userId: 'server-derived-user',
  },
  user: {
    email: 'person@example.com',
    emailVerified: true,
    id: 'server-derived-user',
    image: null,
    name: 'Person',
  },
}

const CREATED = {
  createdAt: '2026-08-08T10:00:00.000Z',
  itemId: ITEM_ID,
  token: TOKEN,
}

const PUBLIC_ITEM = {
  authoredTitle: 'Shared note',
  description: null,
  displayTitle: 'Shared note',
  faviconUrl: null,
  imageUrl: null,
  kind: 'note' as const,
  noteMarkdown: '# Body',
  originalUrl: null,
  siteName: null,
}

function createTestLogger(): AppLogger {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }
}

function createSharing(overrides: Partial<SharingModule> = {}): SharingModule {
  return {
    create: vi.fn().mockResolvedValue(CREATED),
    getStatus: vi.fn().mockResolvedValue({
      active: true,
      createdAt: CREATED.createdAt,
    }),
    resolvePublic: vi.fn().mockResolvedValue(PUBLIC_ITEM),
    revoke: vi.fn().mockResolvedValue(undefined),
    revokeForLifecycle: vi.fn().mockResolvedValue(undefined),
    rotate: vi.fn().mockResolvedValue(CREATED),
    ...overrides,
  }
}

function createItems(): ItemsModule {
  return {
    act: vi.fn(),
    capture: vi.fn(),
    findDuplicateLinks: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
  }
}

function createAuthenticatedApp(sharing?: SharingModule) {
  return createApp({
    auth: {
      getSession: vi.fn().mockResolvedValue(AUTH_SESSION),
      handler: vi.fn(),
    },
    checkReadiness: vi.fn().mockResolvedValue(undefined),
    items: createItems(),
    logger: createTestLogger(),
    ...(sharing ? { sharing } : {}),
    trustedOrigin: 'http://localhost:5173',
  })
}

describe('Sharing HTTP interface', () => {
  it('creates, rotates, and revokes Share Links for the session actor', async () => {
    const sharing = createSharing()
    const app = createAuthenticatedApp(sharing)

    const created = await app.request(`/api/v1/items/${ITEM_ID}/share`, {
      method: 'POST',
    })
    expect(created.status).toBe(201)
    expect(shareLinkCreatedSchema.parse(await created.json())).toEqual(CREATED)
    expect(sharing.create).toHaveBeenCalledWith('server-derived-user', ITEM_ID)

    const status = await app.request(`/api/v1/items/${ITEM_ID}/share`)
    expect(status.status).toBe(200)
    expect(shareLinkStatusSchema.parse(await status.json())).toEqual({
      active: true,
      createdAt: CREATED.createdAt,
    })

    const rotated = await app.request(`/api/v1/items/${ITEM_ID}/share/rotate`, {
      method: 'POST',
    })
    expect(rotated.status).toBe(200)
    expect(shareLinkCreatedSchema.parse(await rotated.json())).toEqual(CREATED)

    const revoked = await app.request(`/api/v1/items/${ITEM_ID}/share`, {
      method: 'DELETE',
    })
    expect(revoked.status).toBe(204)
    expect(sharing.revoke).toHaveBeenCalledWith('server-derived-user', ITEM_ID)
  })

  it('resolves public tokens without authentication and sets privacy headers', async () => {
    const sharing = createSharing()
    const app = createApp({
      auth: {
        getSession: vi.fn().mockResolvedValue(null),
        handler: vi.fn(),
      },
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      sharing,
      trustedOrigin: 'http://localhost:5173',
    })

    const response = await app.request(`/api/v1/public/shares/${TOKEN}`)
    expect(response.status).toBe(200)
    expect(publicSharedItemSchema.parse(await response.json())).toEqual(
      PUBLIC_ITEM,
    )
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(sharing.resolvePublic).toHaveBeenCalledWith(TOKEN)
  })

  it('returns a generic unavailable state for all public misses', async () => {
    const sharing = createSharing({
      resolvePublic: vi.fn().mockResolvedValue(null),
    })
    const app = createApp({
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      sharing,
      trustedOrigin: 'http://localhost:5173',
    })

    const response = await app.request(`/api/v1/public/shares/${TOKEN}`)
    const body = apiErrorSchema.parse(await response.json())
    expect(response.status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.message).toBe('This shared Item is unavailable.')
  })

  it('maps owner failures without leaking existence across tenants', async () => {
    const sharing = createSharing({
      create: vi
        .fn()
        .mockRejectedValue(
          new SharingError('NOT_FOUND', 'The requested Item was not found.'),
        ),
    })
    const app = createAuthenticatedApp(sharing)
    const response = await app.request(`/api/v1/items/${ITEM_ID}/share`, {
      method: 'POST',
    })
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
