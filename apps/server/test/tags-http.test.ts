import { describe, expect, it, vi } from 'vitest'

import {
  apiErrorSchema,
  itemViewSchema,
  tagListSchema,
  tagViewSchema,
} from '@cerebero/contracts'

import { createApp } from '../src/http/app.js'
import type { AppLogger } from '../src/infrastructure/logging/logger.js'
import type { ItemsModule } from '../src/modules/items/item-types.js'
import type { TagsModule } from '../src/modules/tags/tag-types.js'
import { TagsError } from '../src/modules/tags/tag-types.js'

const ITEM_ID = '00000000-0000-4000-8000-000000000001'
const TAG_ID = '00000000-0000-4000-8000-000000000101'

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

const TAG = {
  createdAt: '2026-08-07T12:00:00.000Z',
  id: TAG_ID,
  name: 'Research',
}

const ITEM = {
  authoredTitle: null,
  createdAt: '2026-08-06T09:00:00.000Z',
  displayTitle: 'example.com',
  enrichment: null,
  id: ITEM_ID,
  kind: 'note' as const,
  noteMarkdown: '# Note',
  originalUrl: null,
  pinnedAt: null,
  status: 'inbox' as const,
  tags: [TAG],
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

function createTags(overrides: Partial<TagsModule> = {}): TagsModule {
  return {
    attach: vi.fn().mockResolvedValue([TAG]),
    create: vi.fn().mockResolvedValue(TAG),
    delete: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(TAG),
    list: vi.fn().mockResolvedValue({ tags: [TAG] }),
    rename: vi.fn().mockResolvedValue(TAG),
    ...overrides,
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

function createAuthenticatedApp(tags?: TagsModule, items?: ItemsModule) {
  return createApp({
    auth: {
      getSession: vi.fn().mockResolvedValue(AUTH_SESSION),
      handler: vi.fn(),
    },
    checkReadiness: vi.fn().mockResolvedValue(undefined),
    ...(items ? { items } : {}),
    logger: createTestLogger(),
    ...(tags ? { tags } : {}),
    trustedOrigin: 'http://localhost:5173',
  })
}

describe('Tags HTTP interface', () => {
  it('creates a Tag using the server-derived actor', async () => {
    const tags = createTags()
    const app = createAuthenticatedApp(tags)
    const response = await app.request('/api/v1/tags', {
      body: JSON.stringify({ name: 'Research' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    expect(response.status).toBe(201)
    expect(tagViewSchema.parse(await response.json())).toEqual(TAG)
    expect(tags.create).toHaveBeenCalledWith('server-derived-user', {
      name: 'Research',
    })
  })

  it('lists Tags for the authenticated User', async () => {
    const tags = createTags()
    const app = createAuthenticatedApp(tags)
    const response = await app.request('/api/v1/tags')

    expect(response.status).toBe(200)
    expect(tagListSchema.parse(await response.json())).toEqual({ tags: [TAG] })
    expect(tags.list).toHaveBeenCalledWith('server-derived-user')
  })

  it('renames and deletes Tags through stable routes', async () => {
    const tags = createTags()
    const app = createAuthenticatedApp(tags)

    const renamed = await app.request(`/api/v1/tags/${TAG_ID}`, {
      body: JSON.stringify({ name: 'Later' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    expect(renamed.status).toBe(200)
    expect(tags.rename).toHaveBeenCalledWith('server-derived-user', TAG_ID, {
      name: 'Later',
    })

    const deleted = await app.request(`/api/v1/tags/${TAG_ID}`, {
      method: 'DELETE',
    })
    expect(deleted.status).toBe(204)
    expect(tags.delete).toHaveBeenCalledWith('server-derived-user', TAG_ID)
  })

  it('attaches and detaches Tags on Items and returns Item projections', async () => {
    const tags = createTags()
    const items = createItems()
    const app = createAuthenticatedApp(tags, items)

    const attached = await app.request(`/api/v1/items/${ITEM_ID}/tags/${TAG_ID}`, {
      method: 'PUT',
    })
    expect(attached.status).toBe(200)
    expect(itemViewSchema.parse(await attached.json())).toEqual(ITEM)
    expect(tags.attach).toHaveBeenCalledWith(
      'server-derived-user',
      ITEM_ID,
      TAG_ID,
    )
    expect(items.get).toHaveBeenCalledWith('server-derived-user', ITEM_ID)

    const detachedItem = { ...ITEM, tags: [] }
    items.get = vi.fn().mockResolvedValue(detachedItem)
    tags.detach = vi.fn().mockResolvedValue([])
    const detached = await app.request(
      `/api/v1/items/${ITEM_ID}/tags/${TAG_ID}`,
      { method: 'DELETE' },
    )
    expect(detached.status).toBe(200)
    expect(itemViewSchema.parse(await detached.json())).toEqual(detachedItem)
  })

  it('maps duplicate and not-found Tag failures safely', async () => {
    const tags = createTags({
      create: vi
        .fn()
        .mockRejectedValue(
          new TagsError('DUPLICATE_TAG', 'A Tag with this name already exists.'),
        ),
      rename: vi
        .fn()
        .mockRejectedValue(
          new TagsError('NOT_FOUND', 'The requested Tag was not found.'),
        ),
    })
    const app = createAuthenticatedApp(tags)

    const duplicate = await app.request('/api/v1/tags', {
      body: JSON.stringify({ name: 'Research' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    expect(duplicate.status).toBe(409)
    expect(apiErrorSchema.parse(await duplicate.json()).error.code).toBe(
      'DUPLICATE_TAG',
    )

    const missing = await app.request(`/api/v1/tags/${TAG_ID}`, {
      body: JSON.stringify({ name: 'Later' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    expect(missing.status).toBe(404)
    expect(apiErrorSchema.parse(await missing.json()).error.code).toBe(
      'NOT_FOUND',
    )
  })

  it('rejects client-selected ownership, invalid IDs, and anonymous callers', async () => {
    const tags = createTags()
    const app = createAuthenticatedApp(tags)

    const ownedByClient = await app.request('/api/v1/tags', {
      body: JSON.stringify({ name: 'Research', ownerId: 'attacker' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    expect(ownedByClient.status).toBe(400)
    expect(tags.create).not.toHaveBeenCalled()

    const invalidId = await app.request('/api/v1/tags/not-a-uuid', {
      body: JSON.stringify({ name: 'Later' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    expect(invalidId.status).toBe(400)
    expect(tags.rename).not.toHaveBeenCalled()

    const anonymous = createApp({
      auth: {
        getSession: vi.fn().mockResolvedValue(null),
        handler: vi.fn(),
      },
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      tags,
      trustedOrigin: 'http://localhost:5173',
    })
    const unauthenticated = await anonymous.request('/api/v1/tags')
    expect(unauthenticated.status).toBe(401)
    expect(tags.list).not.toHaveBeenCalled()
  })

  it('reports unavailable Tag storage without internals', async () => {
    const app = createAuthenticatedApp()
    const response = await app.request('/api/v1/tags')
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE')
  })
})
