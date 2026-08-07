import { describe, expect, it, vi } from 'vitest'

import { apiErrorSchema, searchResponseSchema } from '@cerebero/contracts'

import { createApp } from '../src/http/app.js'
import type { AppLogger } from '../src/infrastructure/logging/logger.js'
import type { SearchModule } from '../src/modules/search/search-types.js'
import { SearchError } from '../src/modules/search/search-types.js'

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

const PAGE = {
  items: [],
  nextCursor: null,
}

function createTestLogger(): AppLogger {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }
}

describe('Search HTTP interface', () => {
  it('searches with the server-derived actor and validated filters', async () => {
    const search: SearchModule = {
      search: vi.fn().mockResolvedValue(PAGE),
    }
    const app = createApp({
      auth: {
        getSession: vi.fn().mockResolvedValue(AUTH_SESSION),
        handler: vi.fn(),
      },
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      search,
      trustedOrigin: 'http://localhost:5173',
    })

    const response = await app.request(
      '/api/v1/search?q=neural&status=library&pinned=true&kind=link',
    )

    expect(response.status).toBe(200)
    expect(searchResponseSchema.parse(await response.json())).toEqual(PAGE)
    expect(search.search).toHaveBeenCalledWith('server-derived-user', {
      kind: 'link',
      limit: 25,
      pinned: true,
      q: 'neural',
      status: 'library',
    })
  })

  it('rejects invalid queries and unauthenticated callers', async () => {
    const search: SearchModule = {
      search: vi.fn().mockResolvedValue(PAGE),
    }
    const app = createApp({
      auth: {
        getSession: vi.fn().mockResolvedValue(AUTH_SESSION),
        handler: vi.fn(),
      },
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      search,
      trustedOrigin: 'http://localhost:5173',
    })

    const invalid = await app.request('/api/v1/search')
    expect(invalid.status).toBe(400)
    expect(search.search).not.toHaveBeenCalled()

    const anonymous = createApp({
      auth: {
        getSession: vi.fn().mockResolvedValue(null),
        handler: vi.fn(),
      },
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      search,
      trustedOrigin: 'http://localhost:5173',
    })
    const unauthenticated = await anonymous.request('/api/v1/search?q=ok')
    expect(unauthenticated.status).toBe(401)

    search.search = vi
      .fn()
      .mockRejectedValue(
        new SearchError('INVALID_REQUEST', 'The pagination cursor is invalid.'),
      )
    const badCursor = await app.request(
      '/api/v1/search?q=ok&cursor=not-a-cursor',
    )
    // Schema accepts any cursor string; module maps invalid cursor decode.
    // Force module path with a schema-valid long-enough-looking cursor after parse.
    // Here the mock rejection simulates module-level validation.
    expect(apiErrorSchema.parse(await badCursor.json()).error.code).toBe(
      'INVALID_REQUEST',
    )
  })
})
