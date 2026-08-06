import { randomUUID } from 'node:crypto'

import { z } from 'zod'

import type {
  ClaimedEnrichmentJob,
  EnrichmentFailure,
  EnrichmentFailureResult,
  EnrichmentQueue,
  EnrichmentQueueRepository,
  ReconciliationResult,
} from './enrichment-types.js'
import { EnrichmentQueueError, toLeaseToken } from './enrichment-types.js'

const DEFAULT_LEASE_DURATION_MS = 60_000
const DEFAULT_MAX_ATTEMPTS = 5
const MAX_RECONCILIATION_BATCH = 500

function isSafeMetadataUrl(value: string | null): boolean {
  if (!value) {
    return true
  }

  try {
    const url = new URL(value)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

const nullableBoundedText = (maximumLength: number) =>
  z.string().trim().min(1).max(maximumLength).nullable()

const nullableMetadataUrl = z
  .string()
  .trim()
  .min(1)
  .max(2_048)
  .nullable()
  .refine(
    isSafeMetadataUrl,
    'Metadata URLs must use HTTP or HTTPS without credentials.',
  )

const enrichmentMetadataSchema = z
  .object({
    canonicalUrl: nullableMetadataUrl,
    description: nullableBoundedText(2_000),
    extractedTitle: nullableBoundedText(500),
    faviconUrl: nullableMetadataUrl,
    imageUrl: nullableMetadataUrl,
    provider: nullableBoundedText(100),
    siteName: nullableBoundedText(200),
  })
  .strict()

type EnrichmentQueueOptions = {
  clock?: () => Date
  createLeaseToken?: () => string
  leaseDurationMs?: number
  maxAttempts?: number
  repository: EnrichmentQueueRepository
  retryDelayMs?: (attemptCount: number) => number
}

function defaultRetryDelayMs(attemptCount: number): number {
  if (attemptCount <= 1) {
    return 30_000
  }
  if (attemptCount === 2) {
    return 120_000
  }
  if (attemptCount === 3) {
    return 600_000
  }
  return 1_800_000
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`)
  }
}

export function createEnrichmentQueue(
  options: EnrichmentQueueOptions,
): EnrichmentQueue {
  const clock = options.clock ?? (() => new Date())
  const createLeaseToken = options.createLeaseToken ?? randomUUID
  const leaseDurationMs = options.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const retryDelayMs = options.retryDelayMs ?? defaultRetryDelayMs

  assertPositiveInteger(leaseDurationMs, 'leaseDurationMs')
  assertPositiveInteger(maxAttempts, 'maxAttempts')

  async function assertLeaseMutation(
    operation: Promise<boolean>,
  ): Promise<void> {
    if (!(await operation)) {
      throw new EnrichmentQueueError(
        'LEASE_LOST',
        'The enrichment job lease is no longer valid.',
      )
    }
  }

  return {
    claimNext: () => {
      const now = clock()
      const rawLeaseToken = createLeaseToken()
      const parsedLeaseToken = z.string().uuid().safeParse(rawLeaseToken)
      if (!parsedLeaseToken.success) {
        throw new Error('createLeaseToken must return a UUID.')
      }
      return options.repository.claimNext({
        leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
        leaseToken: toLeaseToken(parsedLeaseToken.data),
        now,
      })
    },

    complete: async (claim, metadata) => {
      const parsedMetadata = enrichmentMetadataSchema.safeParse(metadata)
      if (!parsedMetadata.success) {
        throw new EnrichmentQueueError(
          'INVALID_METADATA',
          'Enrichment metadata is invalid.',
        )
      }

      await assertLeaseMutation(
        options.repository.complete({
          claim,
          metadata: parsedMetadata.data,
          now: clock(),
        }),
      )
    },

    fail: async (
      claim: ClaimedEnrichmentJob,
      failure: EnrichmentFailure,
    ): Promise<EnrichmentFailureResult> => {
      const now = clock()
      if (!failure.retryable || claim.attemptCount >= maxAttempts) {
        await assertLeaseMutation(
          options.repository.failTerminal({
            claim,
            errorCode: failure.code,
            now,
          }),
        )
        return { outcome: 'terminal' }
      }

      const delay = retryDelayMs(claim.attemptCount)
      assertPositiveInteger(delay, 'retryDelayMs result')
      const availableAt = new Date(now.getTime() + delay)
      await assertLeaseMutation(
        options.repository.reschedule({
          availableAt,
          claim,
          errorCode: failure.code,
          now,
        }),
      )
      return { availableAt, outcome: 'rescheduled' }
    },

    reconcileStale: (limit = 100): Promise<ReconciliationResult> => {
      if (
        !Number.isInteger(limit) ||
        limit <= 0 ||
        limit > MAX_RECONCILIATION_BATCH
      ) {
        throw new Error(
          `reconciliation limit must be between 1 and ${MAX_RECONCILIATION_BATCH}.`,
        )
      }

      return options.repository.reconcileStale({
        errorCode: 'lease_expired',
        limit,
        maxAttempts,
        now: clock(),
      })
    },
  }
}
