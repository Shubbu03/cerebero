import { describe, expect, it } from 'vitest'

import {
  RestrictedHttpError,
  type RestrictedHttpClient,
} from '../src/infrastructure/outbound-http/outbound-http-types.js'
import { createEnrichmentProcessor } from '../src/modules/enrichment/enrichment-processor.js'
import { createEnrichmentQueue } from '../src/modules/enrichment/enrichment-queue.js'
import type { MetadataParser } from '../src/modules/enrichment/metadata-parser.js'
import { InMemoryEnrichmentQueueRepository } from './support/in-memory-enrichment-queue-repository.js'

const JOB_ID = '10000000-0000-4000-8000-000000000001'
const ITEM_ID = '20000000-0000-4000-8000-000000000001'
const LEASE_TOKEN = '30000000-0000-4000-8000-000000000001'
const BASE_TIME = new Date('2026-08-06T12:00:00.000Z')
const encoder = new TextEncoder()

function createHarness(options: {
  httpClient?: RestrictedHttpClient
  parser?: MetadataParser
}) {
  const repository = new InMemoryEnrichmentQueueRepository()
  let now = new Date(BASE_TIME)
  repository.seed({
    availableAt: now,
    id: JOB_ID,
    itemId: ITEM_ID,
    originalUrl: 'https://example.com/article',
  })
  const queue = createEnrichmentQueue({
    clock: () => new Date(now),
    createLeaseToken: () => LEASE_TOKEN,
    leaseDurationMs: 60_000,
    repository,
  })
  const httpClient: RestrictedHttpClient = options.httpClient ?? {
    get: () =>
      Promise.resolve({
        body: encoder.encode(
          '<head><meta property="og:title" content="Extracted title"></head>',
        ),
        contentType: 'text/html',
        finalUrl: 'https://example.com/article',
        statusCode: 200,
      }),
  }
  const processor = createEnrichmentProcessor({
    httpClient,
    ...(options.parser ? { parser: options.parser } : {}),
    queue,
  })

  return {
    advanceBy(milliseconds: number) {
      now = new Date(now.getTime() + milliseconds)
    },
    processor,
    queue,
    repository,
  }
}

describe('Enrichment processor', () => {
  it('fetches, parses, and completes a claimed job', async () => {
    const harness = createHarness({})
    const claim = await harness.queue.claimNext()
    if (!claim) {
      throw new Error('Expected a claim.')
    }

    await expect(harness.processor.process(claim)).resolves.toEqual({
      outcome: 'completed',
    })
    expect(harness.repository.jobs.get(JOB_ID)).toMatchObject({
      status: 'completed',
    })
    expect(harness.repository.enrichments.get(ITEM_ID)).toMatchObject({
      metadata: { extractedTitle: 'Extracted title' },
      state: 'succeeded',
    })
  })

  it('reschedules retryable restricted-network failures', async () => {
    const harness = createHarness({
      httpClient: {
        get: () => Promise.reject(new RestrictedHttpError('timed_out', true)),
      },
    })
    const claim = await harness.queue.claimNext()
    if (!claim) {
      throw new Error('Expected a claim.')
    }

    await expect(harness.processor.process(claim)).resolves.toEqual({
      availableAt: new Date('2026-08-06T12:00:30.000Z'),
      errorCode: 'timed_out',
      outcome: 'rescheduled',
    })
  })

  it('terminates permanent network and parser failures', async () => {
    const blocked = createHarness({
      httpClient: {
        get: () =>
          Promise.reject(new RestrictedHttpError('blocked_unsafe_url', false)),
      },
    })
    const blockedClaim = await blocked.queue.claimNext()
    if (!blockedClaim) {
      throw new Error('Expected a claim.')
    }
    await expect(blocked.processor.process(blockedClaim)).resolves.toEqual({
      errorCode: 'blocked_unsafe_url',
      outcome: 'terminal',
    })

    const invalid = createHarness({
      parser: {
        parse: () => ({
          canonicalUrl: 'file:///etc/passwd',
          description: null,
          extractedTitle: null,
          faviconUrl: null,
          imageUrl: null,
          provider: null,
          siteName: null,
        }),
      },
    })
    const invalidClaim = await invalid.queue.claimNext()
    if (!invalidClaim) {
      throw new Error('Expected a claim.')
    }
    await expect(invalid.processor.process(invalidClaim)).resolves.toEqual({
      errorCode: 'invalid_metadata',
      outcome: 'terminal',
    })
  })

  it('does not mutate a job after its lease is lost', async () => {
    const harness = createHarness({})
    const claim = await harness.queue.claimNext()
    if (!claim) {
      throw new Error('Expected a claim.')
    }
    harness.advanceBy(60_000)

    await expect(harness.processor.process(claim)).resolves.toEqual({
      outcome: 'lease_lost',
    })
    expect(harness.repository.jobs.get(JOB_ID)).toMatchObject({
      status: 'processing',
    })
  })

  it('leaves unexpected infrastructure failures for stale-lease reconciliation', async () => {
    const harness = createHarness({
      httpClient: {
        get: () => Promise.reject(new Error('unexpected adapter defect')),
      },
    })
    const claim = await harness.queue.claimNext()
    if (!claim) {
      throw new Error('Expected a claim.')
    }

    await expect(harness.processor.process(claim)).rejects.toThrow(
      'unexpected adapter defect',
    )
    expect(harness.repository.jobs.get(JOB_ID)).toMatchObject({
      status: 'processing',
    })
  })
})
