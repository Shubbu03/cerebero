import { describe, expect, it, vi } from 'vitest'

import { apiErrorSchema, healthResponseSchema } from '@cerebero/contracts'

import { createApp } from '../src/http/app.js'
import type { AppLogger } from '../src/infrastructure/logging/logger.js'

function createTestLogger(): AppLogger {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }
}

describe('operational HTTP interface', () => {
  it('reports liveness with security and correlation headers', async () => {
    const app = createApp({
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      trustedOrigin: 'http://localhost:5173',
    })

    const response = await app.request('/health/live')

    expect(response.status).toBe(200)
    expect(healthResponseSchema.parse(await response.json())).toEqual({
      status: 'ok',
    })
    expect(response.headers.get('content-security-policy')).toContain(
      "default-src 'self'",
    )
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-request-id')).toBeTruthy()
  })

  it('reports readiness without leaking the database failure', async () => {
    const app = createApp({
      checkReadiness: vi.fn().mockRejectedValue(new Error('secret-db-host')),
      logger: createTestLogger(),
      trustedOrigin: 'http://localhost:5173',
    })

    const response = await app.request('/health/ready')
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE')
    expect(JSON.stringify(body)).not.toContain('secret-db-host')
  })

  it('uses the stable not-found envelope', async () => {
    const app = createApp({
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      trustedOrigin: 'http://localhost:5173',
    })

    const response = await app.request('/missing')
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('fails honestly when authentication is not configured', async () => {
    const app = createApp({
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      trustedOrigin: 'http://localhost:5173',
    })

    const response = await app.request('/api/auth/get-session', {
      headers: { Origin: 'http://localhost:5173' },
    })
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('AUTH_UNAVAILABLE')
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:5173',
    )
    expect(response.headers.get('access-control-allow-credentials')).toBe(
      'true',
    )
  })

  it('returns an allowlisted authenticated session projection', async () => {
    const authSession = {
      session: {
        expiresAt: '2026-08-13T00:00:00.000Z',
        id: 'session-1',
        userId: 'user-1',
      },
      user: {
        email: 'person@example.com',
        emailVerified: true,
        id: 'user-1',
        image: null,
        name: 'Person',
      },
    }
    const app = createApp({
      auth: {
        getSession: vi.fn().mockResolvedValue(authSession),
        handler: vi.fn(),
      },
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      trustedOrigin: 'http://localhost:5173',
    })

    const response = await app.request('/api/v1/session')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(authSession)
    expect(response.headers.get('server-timing')).toMatch(
      /auth;dur=.*handler;dur=.*total;dur=/,
    )
  })

  it('returns stable rate-limit headers and error envelope', async () => {
    const app = createApp({
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      rateLimit: {
        consume: vi.fn().mockResolvedValue({
          allowed: false,
          limit: 30,
          remaining: 0,
          resetAt: 60_000,
          retryAfterSeconds: 12,
        }),
      },
      trustedOrigin: 'http://localhost:5173',
    })

    const response = await app.request(
      `/api/v1/public/shares/${'a'.repeat(40)}`,
    )
    const body = apiErrorSchema.parse(await response.json())

    expect(response.status).toBe(429)
    expect(body.error.code).toBe('RATE_LIMITED')
    expect(response.headers.get('retry-after')).toBe('12')
    expect(response.headers.get('ratelimit-limit')).toBe('30')
    expect(response.headers.get('ratelimit-remaining')).toBe('0')
    expect(response.headers.get('ratelimit-reset')).toBe('60')
  })

  it('does not perform a session lookup for public share resolution', async () => {
    const getSession = vi.fn()
    const app = createApp({
      auth: {
        getSession,
        handler: vi.fn(),
      },
      checkReadiness: vi.fn().mockResolvedValue(undefined),
      logger: createTestLogger(),
      trustedOrigin: 'http://localhost:5173',
    })

    const response = await app.request(
      `/api/v1/public/shares/${'a'.repeat(40)}`,
    )

    expect(response.status).toBe(404)
    expect(getSession).not.toHaveBeenCalled()
  })
})
