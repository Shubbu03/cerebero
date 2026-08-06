import { describe, expect, it } from 'vitest'

import { createEnrichmentQueue } from '../src/modules/enrichment/enrichment-queue.js'
import { toLeaseToken } from '../src/modules/enrichment/enrichment-types.js'
import { InMemoryEnrichmentQueueRepository } from './support/in-memory-enrichment-queue-repository.js'

const JOB_ID = '10000000-0000-4000-8000-000000000001'
const ITEM_ID = '20000000-0000-4000-8000-000000000001'
const BASE_TIME = new Date('2026-08-06T12:00:00.000Z')
const EMPTY_METADATA = {
  canonicalUrl: null,
  description: null,
  extractedTitle: null,
  faviconUrl: null,
  imageUrl: null,
  provider: null,
  siteName: null,
}

function createTestQueue(options: { attemptCount?: number } = {}) {
  const repository = new InMemoryEnrichmentQueueRepository()
  let now = new Date(BASE_TIME)
  repository.seed({
    ...(options.attemptCount === undefined
      ? {}
      : { attemptCount: options.attemptCount }),
    availableAt: now,
    id: JOB_ID,
    itemId: ITEM_ID,
    originalUrl: 'https://example.com/article',
  })
  const queue = createEnrichmentQueue({
    clock: () => new Date(now),
    createLeaseToken: () => '30000000-0000-4000-8000-000000000001',
    leaseDurationMs: 60_000,
    maxAttempts: 5,
    repository,
  })

  return {
    advanceBy: (milliseconds: number) => {
      now = new Date(now.getTime() + milliseconds)
    },
    queue,
    repository,
  }
}

describe('Enrichment queue', () => {
  it('leases one available job and prevents a concurrent second claim', async () => {
    const { queue, repository } = createTestQueue()
    const claim = await queue.claimNext()

    expect(claim).toMatchObject({
      attemptCount: 1,
      itemId: ITEM_ID,
      jobId: JOB_ID,
      originalUrl: 'https://example.com/article',
    })
    await expect(queue.claimNext()).resolves.toBeNull()
    expect(repository.jobs.get(JOB_ID)).toMatchObject({
      attemptCount: 1,
      status: 'processing',
    })
    expect(repository.enrichments.get(ITEM_ID)).toMatchObject({
      state: 'processing',
    })
  })

  it('reschedules retryable failures with deterministic bounded backoff', async () => {
    const { advanceBy, queue, repository } = createTestQueue()
    const claim = await queue.claimNext()
    if (!claim) {
      throw new Error('Expected a claimed job.')
    }

    const result = await queue.fail(claim, {
      code: 'timed_out',
      retryable: true,
    })
    expect(result).toEqual({
      availableAt: new Date('2026-08-06T12:00:30.000Z'),
      outcome: 'rescheduled',
    })
    expect(repository.enrichments.get(ITEM_ID)).toMatchObject({
      lastErrorCode: 'timed_out',
      state: 'retryable_failed',
    })

    await expect(queue.claimNext()).resolves.toBeNull()
    advanceBy(30_000)
    await expect(queue.claimNext()).resolves.toMatchObject({ attemptCount: 2 })
  })

  it('makes the final retry terminal once the attempt bound is reached', async () => {
    const { queue, repository } = createTestQueue({ attemptCount: 4 })
    const claim = await queue.claimNext()
    if (!claim) {
      throw new Error('Expected a claimed job.')
    }

    await expect(
      queue.fail(claim, { code: 'unavailable', retryable: true }),
    ).resolves.toEqual({ outcome: 'terminal' })
    expect(repository.jobs.get(JOB_ID)).toMatchObject({ status: 'dead' })
    expect(repository.enrichments.get(ITEM_ID)).toMatchObject({
      lastErrorCode: 'unavailable',
      state: 'terminal_failed',
    })
  })

  it('records non-retryable failures as terminal immediately', async () => {
    const { queue, repository } = createTestQueue()
    const claim = await queue.claimNext()
    if (!claim) {
      throw new Error('Expected a claimed job.')
    }

    await queue.fail(claim, {
      code: 'unsupported_content',
      retryable: false,
    })
    expect(repository.jobs.get(JOB_ID)).toMatchObject({ status: 'dead' })
  })

  it('validates metadata before completing a job', async () => {
    const { queue, repository } = createTestQueue()
    const claim = await queue.claimNext()
    if (!claim) {
      throw new Error('Expected a claimed job.')
    }

    await expect(
      queue.complete(claim, {
        ...EMPTY_METADATA,
        canonicalUrl: 'file:///etc/passwd',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_METADATA',
    })
    expect(repository.jobs.get(JOB_ID)).toMatchObject({ status: 'processing' })

    await queue.complete(claim, {
      ...EMPTY_METADATA,
      extractedTitle: 'Bounded title',
    })
    expect(repository.jobs.get(JOB_ID)).toMatchObject({ status: 'completed' })
    expect(repository.enrichments.get(ITEM_ID)).toMatchObject({
      metadata: { extractedTitle: 'Bounded title' },
      state: 'succeeded',
    })
  })

  it('rejects expired, forged, and already-consumed leases', async () => {
    const expired = createTestQueue()
    const expiredClaim = await expired.queue.claimNext()
    if (!expiredClaim) {
      throw new Error('Expected a claimed job.')
    }
    expired.advanceBy(60_000)
    await expect(
      expired.queue.complete(expiredClaim, EMPTY_METADATA),
    ).rejects.toMatchObject({
      code: 'LEASE_LOST',
    })

    const forged = createTestQueue()
    const validClaim = await forged.queue.claimNext()
    if (!validClaim) {
      throw new Error('Expected a claimed job.')
    }
    await expect(
      forged.queue.complete(
        {
          ...validClaim,
          leaseToken: toLeaseToken('40000000-0000-4000-8000-000000000001'),
        },
        EMPTY_METADATA,
      ),
    ).rejects.toMatchObject({
      code: 'LEASE_LOST',
    })

    await forged.queue.complete(validClaim, EMPTY_METADATA)
    await expect(
      forged.queue.complete(validClaim, EMPTY_METADATA),
    ).rejects.toMatchObject({
      code: 'LEASE_LOST',
    })
  })

  it('reconciles expired leases into retryable and terminal states', async () => {
    const repository = new InMemoryEnrichmentQueueRepository()
    const now = new Date(BASE_TIME)
    repository.seed({
      attemptCount: 2,
      availableAt: now,
      id: JOB_ID,
      itemId: ITEM_ID,
      leaseExpiresAt: new Date(now.getTime() - 1),
      leaseToken: '30000000-0000-4000-8000-000000000001',
      originalUrl: 'https://example.com/retry',
      status: 'processing',
    })
    repository.seed({
      attemptCount: 5,
      availableAt: now,
      id: '10000000-0000-4000-8000-000000000002',
      itemId: '20000000-0000-4000-8000-000000000002',
      leaseExpiresAt: new Date(now.getTime() - 1),
      leaseToken: '30000000-0000-4000-8000-000000000002',
      originalUrl: 'https://example.com/terminal',
      status: 'processing',
    })
    const queue = createEnrichmentQueue({
      clock: () => new Date(now),
      maxAttempts: 5,
      repository,
    })

    await expect(queue.reconcileStale()).resolves.toEqual({
      rescheduled: 1,
      terminal: 1,
    })
    expect(repository.jobs.get(JOB_ID)).toMatchObject({
      lastErrorCode: 'lease_expired',
      status: 'pending',
    })
    expect(
      repository.jobs.get('10000000-0000-4000-8000-000000000002'),
    ).toMatchObject({ status: 'dead' })
  })

  it('bounds reconciliation batches', () => {
    const { queue } = createTestQueue()
    expect(() => queue.reconcileStale(501)).toThrow(
      'reconciliation limit must be between 1 and 500.',
    )
  })
})
