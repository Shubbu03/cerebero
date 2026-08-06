import { describe, expect, it } from 'vitest'

import {
  createEnrichmentRetryModule,
  ENRICHMENT_RETRY_LIMIT,
  ENRICHMENT_RETRY_WINDOW_MS,
} from '../src/modules/enrichment/enrichment-retry.js'
import { toItemId, toUserId } from '../src/modules/items/item-types.js'
import { InMemoryEnrichmentRetryRepository } from './support/in-memory-enrichment-retry-repository.js'

const USER_A = toUserId('user-a')
const USER_B = toUserId('user-b')
const NOW = new Date('2026-08-06T12:00:00.000Z')

function itemId(index: number) {
  return toItemId(`20000000-0000-4000-8000-${String(index).padStart(12, '0')}`)
}

function failedEnrichment(
  state: 'retryable_failed' | 'terminal_failed',
  attemptCount = 3,
) {
  return {
    attemptCount,
    canonicalUrl: 'https://example.com/canonical',
    description: 'Old metadata',
    enrichedAt: null,
    extractedTitle: 'Old title',
    faviconUrl: null,
    imageUrl: null,
    lastErrorCode: 'unavailable' as const,
    nextAttemptAt:
      state === 'retryable_failed' ? new Date(NOW.getTime() + 60_000) : null,
    provider: 'html',
    siteName: 'Example',
    state,
  }
}

function createTestModule() {
  const repository = new InMemoryEnrichmentRetryRepository()
  const retry = createEnrichmentRetryModule({
    clock: () => new Date(NOW),
    repository,
  })
  return { repository, retry }
}

describe('Enrichment retry module', () => {
  it('requeues retryable work immediately while preserving its attempt count', async () => {
    const { repository, retry } = createTestModule()
    const id = itemId(1)
    repository.seed(id, {
      enrichment: failedEnrichment('retryable_failed'),
      hasUrl: true,
      jobAttemptCount: 3,
      jobStatus: 'pending',
      ownerId: USER_A,
    })

    await expect(retry.retry(USER_A, id)).resolves.toEqual({
      attemptCount: 3,
      canonicalUrl: null,
      description: null,
      enrichedAt: null,
      extractedTitle: null,
      faviconUrl: null,
      imageUrl: null,
      lastErrorCode: null,
      nextAttemptAt: NOW.toISOString(),
      provider: null,
      siteName: null,
      state: 'pending',
    })
  })

  it('starts a fresh bounded attempt cycle for terminal work', async () => {
    const { repository, retry } = createTestModule()
    const id = itemId(2)
    repository.seed(id, {
      enrichment: failedEnrichment('terminal_failed', 5),
      hasUrl: true,
      jobAttemptCount: 5,
      jobStatus: 'dead',
      ownerId: USER_A,
    })

    await expect(retry.retry(USER_A, id)).resolves.toMatchObject({
      attemptCount: 0,
      state: 'pending',
    })
  })

  it('does not spend quota for cross-tenant or invalid-state attempts', async () => {
    const { repository, retry } = createTestModule()
    const id = itemId(3)
    repository.seed(id, {
      enrichment: failedEnrichment('terminal_failed'),
      hasUrl: true,
      jobAttemptCount: 3,
      jobStatus: 'dead',
      ownerId: USER_A,
    })

    await expect(retry.retry(USER_B, id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    repository.fixtures.get(id)!.enrichment!.state = 'succeeded'
    await expect(retry.retry(USER_A, id)).rejects.toMatchObject({
      code: 'INVALID_ITEM_STATE',
    })
    expect(repository.rateLimits.size).toBe(0)
  })

  it('enforces the accepted-retry quota and resets it after the window', async () => {
    let now = new Date(NOW)
    const repository = new InMemoryEnrichmentRetryRepository()
    const retry = createEnrichmentRetryModule({
      clock: () => new Date(now),
      repository,
    })

    for (let index = 1; index <= ENRICHMENT_RETRY_LIMIT + 1; index += 1) {
      repository.seed(itemId(index), {
        enrichment: failedEnrichment('terminal_failed'),
        hasUrl: true,
        jobAttemptCount: 5,
        jobStatus: 'dead',
        ownerId: USER_A,
      })
    }

    for (let index = 1; index <= ENRICHMENT_RETRY_LIMIT; index += 1) {
      await expect(retry.retry(USER_A, itemId(index))).resolves.toBeDefined()
    }
    await expect(
      retry.retry(USER_A, itemId(ENRICHMENT_RETRY_LIMIT + 1)),
    ).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      retryAfterSeconds: ENRICHMENT_RETRY_WINDOW_MS / 1_000,
    })

    now = new Date(NOW.getTime() + ENRICHMENT_RETRY_WINDOW_MS)
    await expect(
      retry.retry(USER_A, itemId(ENRICHMENT_RETRY_LIMIT + 1)),
    ).resolves.toBeDefined()
  })

  it('serializes simultaneous retries so only one requeues the Item', async () => {
    const { repository, retry } = createTestModule()
    const id = itemId(9)
    repository.seed(id, {
      enrichment: failedEnrichment('terminal_failed'),
      hasUrl: true,
      jobAttemptCount: 5,
      jobStatus: 'dead',
      ownerId: USER_A,
    })

    const results = await Promise.allSettled([
      retry.retry(USER_A, id),
      retry.retry(USER_A, id),
    ])

    expect(results.map((result) => result.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ])
    expect(repository.rateLimits.get(USER_A)?.requestCount).toBe(1)
  })
})
