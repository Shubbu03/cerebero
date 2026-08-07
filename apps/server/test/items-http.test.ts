import { describe, expect, it, vi } from 'vitest'

import {
  apiErrorSchema,
  duplicateItemResponseSchema,
  enrichmentRetryResponseSchema,
  itemViewSchema,
} from '@cerebero/contracts'

import { createApp } from '../src/http/app.js'
import type { AppLogger } from '../src/infrastructure/logging/logger.js'
import type { ItemsModule } from '../src/modules/items/item-types.js'
import { ItemsError } from '../src/modules/items/item-types.js'
import type { EnrichmentRetryModule } from '../src/modules/enrichment/enrichment-retry.js'
import { EnrichmentRetryError } from '../src/modules/enrichment/enrichment-retry.js'

const ITEM_ID = '00000000-0000-4000-8000-000000000001'

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

const ITEM = {
  authoredTitle: null,
  createdAt: '2026-08-06T09:00:00.000Z',
  displayTitle: 'example.com',
  enrichment: {
    attemptCount: 0,
    canonicalUrl: null,
    description: null,
    enrichedAt: null,
    extractedTitle: null,
    faviconUrl: null,
    imageUrl: null,
    lastErrorCode: null,
    nextAttemptAt: '2026-08-06T09:00:00.000Z',
    provider: null,
    siteName: null,
    state: 'pending' as const,
  },
  id: ITEM_ID,
  kind: 'link' as const,
  noteMarkdown: null,
  originalUrl: 'https://example.com',
  pinnedAt: null,
  status: 'inbox' as const,
  tags: [],
  updatedAt: '2026-08-06T09:00:00.000Z',
  version: 1,
}

function createTestLogger(): AppLogger {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }
}

function createItems(overrides: Partial<ItemsModule> = {}): ItemsModule {
  return {
    act: vi.fn().mockResolvedValue(ITEM),
    capture: vi.fn().mockResolvedValue({ item: ITEM, outcome: 'created' }),
    findDuplicateLinks: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(ITEM),
    list: vi.fn().mockResolvedValue({ items: [ITEM], nextCursor: null }),
    update: vi.fn().mockResolvedValue(ITEM),
    ...overrides,
  }
}

function createAuthenticatedApp(
  items?: ItemsModule,
  enrichmentRetry?: EnrichmentRetryModule,
) {
  return createApp({
    auth: {
      getSession: vi.fn().mockResolvedValue(AUTH_SESSION),
      handler: vi.fn(),
    },
    checkReadiness: vi.fn().mockResolvedValue(undefined),
    ...(enrichmentRetry ? { enrichmentRetry } : {}),
    ...(items ? { items } : {}),
    logger: createTestLogger(),
    trustedOrigin: 'http://localhost:5173',
  })
}

describe('Items HTTP interface', () => {
  it('derives the actor from the session and creates an Item', async () => {
    const items = createItems()
    const app = createAuthenticatedApp(items)
    const response = await app.request('/api/v1/items', {
      body: JSON.stringify({ originalUrl: 'https://example.com' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    expect(response.status).toBe(201)
    expect(itemViewSchema.parse(await response.json())).toEqual(ITEM)
    expect(items.capture).toHaveBeenCalledWith('server-derived-user', {
      allowDuplicate: false,
      originalUrl: 'https://example.com',
    })
  })

  it('returns candidates through the stable duplicate response', async () => {
    const candidate = {
      authoredTitle: null,
      createdAt: ITEM.createdAt,
      displayTitle: ITEM.displayTitle,
      id: ITEM.id,
      kind: ITEM.kind,
      originalUrl: ITEM.originalUrl,
      status: ITEM.status,
      updatedAt: ITEM.updatedAt,
    }
    const items = createItems({
      capture: vi
        .fn()
        .mockResolvedValue({ candidates: [candidate], outcome: 'duplicate' }),
    })
    const app = createAuthenticatedApp(items)
    const response = await app.request('/api/v1/items', {
      body: JSON.stringify({ originalUrl: 'https://example.com' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const body = duplicateItemResponseSchema.parse(await response.json())

    expect(response.status).toBe(409)
    expect(body.error.code).toBe('DUPLICATE_ITEM')
    expect(body.candidates).toEqual([candidate])
  })

  it('rejects client-selected ownership and unknown fields', async () => {
    const items = createItems()
    const app = createAuthenticatedApp(items)
    const response = await app.request('/api/v1/items', {
      body: JSON.stringify({
        originalUrl: 'https://example.com',
        ownerId: 'attacker-selected-user',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('INVALID_REQUEST')
    expect(items.capture).not.toHaveBeenCalled()
  })

  it('requires JSON and caps request bodies', async () => {
    const app = createAuthenticatedApp(createItems())
    const wrongMediaType = await app.request('/api/v1/items', {
      body: 'https://example.com',
      headers: { 'Content-Type': 'text/plain' },
      method: 'POST',
    })
    expect(wrongMediaType.status).toBe(415)

    const oversized = await app.request('/api/v1/items', {
      body: JSON.stringify({ noteMarkdown: 'x'.repeat(140_000) }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const body = apiErrorSchema.parse(await oversized.json())
    expect(oversized.status).toBe(413)
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('rejects anonymous callers before invoking the Items module', async () => {
    const items = createItems()
    const app = createApp({
      auth: {
        getSession: vi.fn().mockResolvedValue(null),
        handler: vi.fn(),
      },
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      items,
      logger: createTestLogger(),
      trustedOrigin: 'http://localhost:5173',
    })
    const response = await app.request('/api/v1/items')
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('UNAUTHENTICATED')
    expect(items.list).not.toHaveBeenCalled()
  })

  it('reports unavailable storage without exposing internals', async () => {
    const app = createAuthenticatedApp()
    const response = await app.request('/api/v1/items')
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE')
  })

  it('maps stale writes to a safe conflict response', async () => {
    const items = createItems({
      update: vi
        .fn()
        .mockRejectedValue(
          new ItemsError('EDIT_CONFLICT', 'Refresh and try again.'),
        ),
    })
    const app = createAuthenticatedApp(items)
    const response = await app.request(`/api/v1/items/${ITEM_ID}`, {
      body: JSON.stringify({ authoredTitle: 'New', expectedVersion: 1 }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(409)
    expect(body.error.code).toBe('EDIT_CONFLICT')
  })

  it('validates IDs and list query parameters before module calls', async () => {
    const items = createItems()
    const app = createAuthenticatedApp(items)
    const invalidId = await app.request('/api/v1/items/not-a-uuid')
    const invalidQuery = await app.request('/api/v1/items?limit=500&owner=x')

    expect(invalidId.status).toBe(400)
    expect(invalidQuery.status).toBe(400)
    expect(items.get).not.toHaveBeenCalled()
    expect(items.list).not.toHaveBeenCalled()
  })

  it('derives retry ownership from the session without requiring a body', async () => {
    const enrichmentRetry: EnrichmentRetryModule = {
      retry: vi.fn().mockResolvedValue(ITEM.enrichment),
    }
    const app = createAuthenticatedApp(createItems(), enrichmentRetry)
    const response = await app.request(
      `/api/v1/items/${ITEM_ID}/enrichment/retry`,
      { method: 'POST' },
    )

    expect(response.status).toBe(200)
    expect(enrichmentRetryResponseSchema.parse(await response.json())).toEqual({
      enrichment: ITEM.enrichment,
    })
    expect(enrichmentRetry.retry).toHaveBeenCalledWith(
      'server-derived-user',
      ITEM_ID,
    )
  })

  it('returns a bounded retry delay when the per-user quota is exhausted', async () => {
    const enrichmentRetry: EnrichmentRetryModule = {
      retry: vi
        .fn()
        .mockRejectedValue(
          new EnrichmentRetryError('RATE_LIMITED', 'Try again later.', 1_800),
        ),
    }
    const app = createAuthenticatedApp(createItems(), enrichmentRetry)
    const response = await app.request(
      `/api/v1/items/${ITEM_ID}/enrichment/retry`,
      { method: 'POST' },
    )
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('1800')
    expect(body.error.code).toBe('RATE_LIMITED')
  })

  it('keeps cross-tenant retry misses indistinguishable from absent Items', async () => {
    const enrichmentRetry: EnrichmentRetryModule = {
      retry: vi
        .fn()
        .mockRejectedValue(
          new EnrichmentRetryError(
            'NOT_FOUND',
            'The requested Item was not found.',
          ),
        ),
    }
    const app = createAuthenticatedApp(createItems(), enrichmentRetry)
    const response = await app.request(
      `/api/v1/items/${ITEM_ID}/enrichment/retry`,
      { method: 'POST' },
    )
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
