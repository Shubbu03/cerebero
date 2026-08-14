import { describe, expect, it } from 'vitest'

import { requestRateLimits } from '../src/http/rate-limit-policy.js'
import { createMemoryRateLimitRepository } from '../src/modules/rate-limit/memory-rate-limit-repository.js'
import { createRateLimitModule } from '../src/modules/rate-limit/rate-limit.js'
import type {
  RateLimitRecord,
  RateLimitRepository,
} from '../src/modules/rate-limit/rate-limit-types.js'

class InMemoryRateLimitRepository implements RateLimitRepository {
  readonly keys: string[] = []
  private readonly records = new Map<string, RateLimitRecord>()

  increment({
    key,
    now,
    resetBefore,
  }: Parameters<RateLimitRepository['increment']>[0]) {
    this.keys.push(key)
    const existing = this.records.get(key)
    const record =
      !existing || existing.windowStartedAt < resetBefore
        ? { count: 1, windowStartedAt: now }
        : { ...existing, count: existing.count + 1 }
    this.records.set(key, record)
    return Promise.resolve(record)
  }
}

describe('application rate limiting', () => {
  it('blocks after the policy limit and does not store the raw subject', async () => {
    const repository = new InMemoryRateLimitRepository()
    const rateLimit = createRateLimitModule({
      now: () => 10_000,
      repository,
    })
    const policy = { limit: 2, scope: 'capture', windowMs: 60_000 }

    await expect(
      rateLimit.consume({ policy, subject: 'private-user-id' }),
    ).resolves.toMatchObject({ allowed: true, remaining: 1 })
    await expect(
      rateLimit.consume({ policy, subject: 'private-user-id' }),
    ).resolves.toMatchObject({ allowed: true, remaining: 0 })
    await expect(
      rateLimit.consume({ policy, subject: 'private-user-id' }),
    ).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60,
    })

    expect(repository.keys).toHaveLength(3)
    expect(repository.keys[0]).toMatch(/^cerebero-api:capture:[a-f0-9]{64}$/)
    expect(repository.keys.join(' ')).not.toContain('private-user-id')
  })

  it('starts a fresh counter after the fixed window expires', async () => {
    let now = 1_000
    const rateLimit = createRateLimitModule({
      now: () => now,
      repository: new InMemoryRateLimitRepository(),
    })
    const policy = { limit: 1, scope: 'search', windowMs: 1_000 }

    expect(
      (await rateLimit.consume({ policy, subject: 'user-1' })).allowed,
    ).toBe(true)
    expect(
      (await rateLimit.consume({ policy, subject: 'user-1' })).allowed,
    ).toBe(false)

    now = 2_001
    await expect(
      rateLimit.consume({ policy, subject: 'user-1' }),
    ).resolves.toMatchObject({ allowed: true, remaining: 0 })
  })

  it('provides a process-local repository without a database round trip', async () => {
    const repository = createMemoryRateLimitRepository()

    await expect(
      repository.increment({
        key: 'capture:user-1',
        now: 1_000,
        resetBefore: 0,
      }),
    ).resolves.toEqual({ count: 1, windowStartedAt: 1_000 })
    await expect(
      repository.increment({
        key: 'capture:user-1',
        now: 1_100,
        resetBefore: 0,
      }),
    ).resolves.toEqual({ count: 2, windowStartedAt: 1_000 })
  })

  it('covers expensive, public, sharing, and destructive request paths', () => {
    expect(
      requestRateLimits('POST', '/api/v1/extension/auth/google'),
    ).toHaveLength(1)
    expect(requestRateLimits('POST', '/api/v1/items')).toHaveLength(1)
    expect(
      requestRateLimits('POST', '/api/v1/items/duplicates/check'),
    ).toHaveLength(1)
    expect(requestRateLimits('GET', '/api/v1/search')).toHaveLength(1)
    expect(
      requestRateLimits('GET', `/api/v1/public/shares/${'a'.repeat(40)}`),
    ).toHaveLength(2)
    expect(
      requestRateLimits('POST', '/api/v1/items/item-1/share/rotate'),
    ).toHaveLength(1)
    expect(
      requestRateLimits('DELETE', '/api/v1/items/item-1/share'),
    ).toHaveLength(1)
    expect(
      requestRateLimits('POST', '/api/v1/items/item-1/actions'),
    ).toHaveLength(1)
    expect(requestRateLimits('GET', '/api/v1/items')).toEqual([])
  })
})
