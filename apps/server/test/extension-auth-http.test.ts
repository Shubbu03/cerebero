import { describe, expect, it, vi } from 'vitest'

import {
  apiErrorSchema,
  extensionGoogleAuthResponseSchema,
  type ExtensionSession,
} from '@cerebero/contracts'

import { createApp } from '../src/http/app.js'
import type { AppLogger } from '../src/infrastructure/logging/logger.js'
import type { ExtensionAuthModule } from '../src/modules/extension-auth/extension-auth-types.js'
import type { ItemsModule } from '../src/modules/items/item-types.js'
import { createExtensionTokenMaterial } from '../src/modules/extension-auth/token.js'

const TOKEN = createExtensionTokenMaterial(() => Buffer.alloc(32, 3)).token
const USER = {
  email: 'person@example.com',
  emailVerified: true,
  id: 'extension-user-1',
  image: null,
  name: 'Person',
}
const EXTENSION_SESSION: ExtensionSession = {
  expiresAt: '2026-09-12T12:00:00.000Z',
  id: '00000000-0000-4000-8000-000000000301',
  scopes: ['items:create', 'items:duplicates:check'],
  user: USER,
}
const ITEM = {
  authoredTitle: null,
  createdAt: '2026-08-13T12:00:00.000Z',
  displayTitle: 'example.com',
  id: '00000000-0000-4000-8000-000000000302',
  kind: 'link' as const,
  noteMarkdown: null,
  originalUrl: 'https://example.com',
  pinnedAt: null,
  status: 'library' as const,
  tags: [],
  trashedAt: null,
  updatedAt: '2026-08-13T12:00:00.000Z',
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

function createExtensionAuth(
  overrides: Partial<ExtensionAuthModule> = {},
): ExtensionAuthModule {
  return {
    authenticate: vi.fn((token) =>
      Promise.resolve(token === TOKEN ? EXTENSION_SESSION : null),
    ),
    exchangeGoogleAccessToken: vi.fn().mockResolvedValue({
      session: EXTENSION_SESSION,
      token: TOKEN,
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createItems(): ItemsModule {
  return {
    act: vi.fn().mockResolvedValue(ITEM),
    capture: vi.fn().mockResolvedValue({ item: ITEM, outcome: 'created' }),
    findDuplicateLinks: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(ITEM),
    list: vi.fn().mockResolvedValue({ items: [ITEM], nextCursor: null }),
    update: vi.fn().mockResolvedValue(ITEM),
  }
}

function createExtensionApp(
  extensionAuth: ExtensionAuthModule,
  items = createItems(),
) {
  return {
    app: createApp({
      auth: {
        getSession: vi.fn().mockResolvedValue(null),
        handler: vi.fn(),
      },
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      extensionAuth,
      items,
      logger: createTestLogger(),
      trustedOrigin: 'http://localhost:5173',
    }),
    items,
  }
}

describe('Extension authentication HTTP boundary', () => {
  it('exchanges a Google token without trying cookie authentication', async () => {
    const exchangeGoogleAccessToken = vi.fn().mockResolvedValue({
      session: EXTENSION_SESSION,
      token: TOKEN,
    })
    const authenticate = vi.fn().mockResolvedValue(null)
    const extensionAuth = createExtensionAuth({
      authenticate,
      exchangeGoogleAccessToken,
    })
    const { app } = createExtensionApp(extensionAuth)

    const response = await app.request('/api/v1/extension/auth/google', {
      body: JSON.stringify({ accessToken: 'google-access-token-long-enough' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(
      extensionGoogleAuthResponseSchema.parse(await response.json()),
    ).toEqual({ session: EXTENSION_SESSION, token: TOKEN })
    expect(exchangeGoogleAccessToken).toHaveBeenCalledWith(
      'google-access-token-long-enough',
    )
    expect(authenticate).not.toHaveBeenCalled()
  })

  it('allows scoped capture and derives ownership from the Extension Session', async () => {
    const extensionAuth = createExtensionAuth()
    const { app, items } = createExtensionApp(extensionAuth)

    const response = await app.request('/api/v1/items', {
      body: JSON.stringify({ originalUrl: 'https://example.com' }),
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(201)
    expect(items.capture).toHaveBeenCalledWith(USER.id, {
      allowDuplicate: false,
      originalUrl: 'https://example.com',
    })
  })

  it('requires the matching scope for each Extension operation', async () => {
    const extensionAuth = createExtensionAuth({
      authenticate: vi.fn().mockResolvedValue({
        ...EXTENSION_SESSION,
        scopes: ['items:duplicates:check'],
      }),
    })
    const { app, items } = createExtensionApp(extensionAuth)

    const response = await app.request('/api/v1/items', {
      body: JSON.stringify({ originalUrl: 'https://example.com' }),
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(403)
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe(
      'FORBIDDEN',
    )
    expect(items.capture).not.toHaveBeenCalled()
  })

  it('forbids Extension Sessions from listing Items or using dashboard APIs', async () => {
    const extensionAuth = createExtensionAuth()
    const { app, items } = createExtensionApp(extensionAuth)
    const headers = { Authorization: `Bearer ${TOKEN}` }

    const listResponse = await app.request('/api/v1/items', { headers })
    const tagsResponse = await app.request('/api/v1/tags', { headers })

    expect(listResponse.status).toBe(403)
    expect(apiErrorSchema.parse(await listResponse.json()).error.code).toBe(
      'FORBIDDEN',
    )
    expect(tagsResponse.status).toBe(403)
    expect(apiErrorSchema.parse(await tagsResponse.json()).error.code).toBe(
      'FORBIDDEN',
    )
    expect(items.list).not.toHaveBeenCalled()
  })

  it('rejects unknown bearer tokens and revokes a valid session on logout', async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    const extensionAuth = createExtensionAuth({ logout })
    const { app } = createExtensionApp(extensionAuth)

    const rejected = await app.request('/api/v1/items', {
      headers: { Authorization: `Bearer cer_ext_${'a'.repeat(43)}` },
    })
    const loggedOut = await app.request('/api/v1/extension/logout', {
      headers: { Authorization: `Bearer ${TOKEN}` },
      method: 'POST',
    })

    expect(rejected.status).toBe(401)
    expect(loggedOut.status).toBe(204)
    expect(logout).toHaveBeenCalledWith(TOKEN)
  })

  it('fails honestly when Extension authentication is not configured', async () => {
    const app = createApp({
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      trustedOrigin: 'http://localhost:5173',
    })

    const response = await app.request('/api/v1/extension/auth/google', {
      body: JSON.stringify({ accessToken: 'google-access-token-long-enough' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    expect(response.status).toBe(503)
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe(
      'AUTH_UNAVAILABLE',
    )
  })
})
