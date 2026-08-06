import { describe, expect, it, vi } from 'vitest'

import type {
  AppLogger,
  LogContext,
} from '../src/infrastructure/logging/logger.js'
import type { EnrichmentProcessor } from '../src/modules/enrichment/enrichment-processor.js'
import type {
  ClaimedEnrichmentJob,
  EnrichmentQueue,
} from '../src/modules/enrichment/enrichment-types.js'
import {
  toEnrichmentJobId,
  toLeaseToken,
} from '../src/modules/enrichment/enrichment-types.js'
import { createEnrichmentWorker } from '../src/modules/enrichment/enrichment-worker.js'
import { toItemId } from '../src/modules/items/item-types.js'

type LogRecord = {
  context: LogContext | undefined
  event: string
  level: 'debug' | 'error' | 'info' | 'warn'
}

function testLogger(): AppLogger & { records: LogRecord[] } {
  const records: LogRecord[] = []
  const write = (
    level: LogRecord['level'],
    event: string,
    context?: LogContext,
  ) => {
    records.push({ context, event, level })
  }

  return {
    debug: (event, context) => write('debug', event, context),
    error: (event, context) => write('error', event, context),
    info: (event, context) => write('info', event, context),
    records,
    warn: (event, context) => write('warn', event, context),
  }
}

function claim(index: number): ClaimedEnrichmentJob {
  const suffix = String(index).padStart(12, '0')
  return {
    attemptCount: 1,
    itemId: toItemId(`20000000-0000-4000-8000-${suffix}`),
    jobId: toEnrichmentJobId(`10000000-0000-4000-8000-${suffix}`),
    leaseExpiresAt: new Date('2026-08-06T12:01:00.000Z'),
    leaseToken: toLeaseToken(`30000000-0000-4000-8000-${suffix}`),
    originalUrl: `https://example.com/article?secret=${index}`,
  }
}

function testQueue(claims: ClaimedEnrichmentJob[]): EnrichmentQueue {
  return {
    claimNext: () => Promise.resolve(claims.shift() ?? null),
    complete: () => Promise.resolve(),
    fail: () => Promise.resolve({ outcome: 'terminal' }),
    reconcileStale: () => Promise.resolve({ rescheduled: 0, terminal: 0 }),
  }
}

describe('Enrichment worker', () => {
  it('never processes more than the configured batch concurrency', async () => {
    const claims = [claim(1), claim(2), claim(3), claim(4), claim(5)]
    const queue = testQueue(claims)
    const releases: (() => void)[] = []
    let active = 0
    let maximumActive = 0
    const processor: EnrichmentProcessor = {
      process: () =>
        new Promise((resolve) => {
          active += 1
          maximumActive = Math.max(maximumActive, active)
          releases.push(() => {
            active -= 1
            resolve({ outcome: 'completed' })
          })
        }),
    }
    const worker = createEnrichmentWorker({
      concurrency: 3,
      logger: testLogger(),
      processor,
      queue,
    })

    const batch = worker.processAvailableBatch()
    await vi.waitFor(() => expect(releases).toHaveLength(3))
    expect(claims).toHaveLength(2)
    for (const release of releases) {
      release()
    }

    await expect(batch).resolves.toBe(3)
    expect(maximumActive).toBe(3)
  })

  it('logs only stable job classifications without source URLs', async () => {
    const logger = testLogger()
    const processor: EnrichmentProcessor = {
      process: () =>
        Promise.resolve({
          availableAt: new Date('2026-08-06T12:00:30.000Z'),
          errorCode: 'timed_out',
          outcome: 'rescheduled',
        }),
    }
    const worker = createEnrichmentWorker({
      logger,
      processor,
      queue: testQueue([claim(7)]),
    })

    await worker.processAvailableBatch()

    expect(logger.records).toContainEqual({
      context: {
        attemptCount: 1,
        errorCode: 'timed_out',
        jobId: '10000000-0000-4000-8000-000000000007',
      },
      event: 'enrichment.job.rescheduled',
      level: 'warn',
    })
    expect(JSON.stringify(logger.records)).not.toContain('secret=7')
    expect(JSON.stringify(logger.records)).not.toContain('example.com')
  })

  it('reconciles on startup and stops an idle poll immediately on abort', async () => {
    const controller = new AbortController()
    const logger = testLogger()
    const reconcileStale = vi.fn(() =>
      Promise.resolve({ rescheduled: 2, terminal: 1 }),
    )
    const queue: EnrichmentQueue = {
      ...testQueue([]),
      reconcileStale,
    }
    const sleep = vi.fn(() => {
      controller.abort()
      return Promise.resolve()
    })
    const worker = createEnrichmentWorker({
      logger,
      processor: { process: () => Promise.resolve({ outcome: 'completed' }) },
      queue,
      sleep,
    })

    await worker.run(controller.signal)

    expect(reconcileStale).toHaveBeenCalledWith(100)
    expect(sleep).toHaveBeenCalledWith(1_000, controller.signal)
    expect(logger.records.map(({ event }) => event)).toEqual([
      'enrichment.worker.started',
      'enrichment.worker.reconciled',
      'enrichment.worker.stopped',
    ])
  })

  it('drains a claimed batch before completing graceful shutdown', async () => {
    const controller = new AbortController()
    let release: (() => void) | undefined
    let started: (() => void) | undefined
    const processingStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    const processor: EnrichmentProcessor = {
      process: () =>
        new Promise((resolve) => {
          release = () => resolve({ outcome: 'completed' })
          started?.()
        }),
    }
    const worker = createEnrichmentWorker({
      logger: testLogger(),
      processor,
      queue: testQueue([claim(9)]),
    })

    const running = worker.run(controller.signal)
    await processingStarted
    controller.abort()
    let stopped = false
    void running.then(() => {
      stopped = true
    })
    await Promise.resolve()
    expect(stopped).toBe(false)

    release?.()
    await expect(running).resolves.toBeUndefined()
  })

  it('contains unexpected processor failures so later jobs still run', async () => {
    const logger = testLogger()
    let calls = 0
    const processor: EnrichmentProcessor = {
      process: () => {
        calls += 1
        return calls === 1
          ? Promise.reject(new Error('database unavailable'))
          : Promise.resolve({ outcome: 'completed' })
      },
    }
    const worker = createEnrichmentWorker({
      concurrency: 2,
      logger,
      processor,
      queue: testQueue([claim(10), claim(11)]),
    })

    await expect(worker.processAvailableBatch()).resolves.toBe(2)
    expect(logger.records.map(({ event }) => event)).toContain(
      'enrichment.job.processing_failed',
    )
    expect(logger.records.map(({ event }) => event)).toContain(
      'enrichment.job.completed',
    )
  })

  it('rejects unsafe worker bounds', () => {
    expect(() =>
      createEnrichmentWorker({
        concurrency: 33,
        logger: testLogger(),
        processor: { process: () => Promise.resolve({ outcome: 'completed' }) },
        queue: testQueue([]),
      }),
    ).toThrow('concurrency must be between 1 and 32.')
  })
})
