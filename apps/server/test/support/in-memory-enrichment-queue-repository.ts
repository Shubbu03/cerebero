import type {
  ClaimedEnrichmentJob,
  EnrichmentErrorCode,
  EnrichmentMetadata,
  EnrichmentQueueRepository,
  LeaseToken,
  ReconciliationResult,
} from '../../src/modules/enrichment/enrichment-types.js'
import {
  toEnrichmentJobId,
  toLeaseToken,
} from '../../src/modules/enrichment/enrichment-types.js'
import { toItemId } from '../../src/modules/items/item-types.js'

type TestJobStatus = 'completed' | 'dead' | 'pending' | 'processing'
type TestEnrichmentState =
  | 'pending'
  | 'processing'
  | 'retryable_failed'
  | 'succeeded'
  | 'terminal_failed'

type TestJob = {
  attemptCount: number
  availableAt: Date
  completedAt: Date | null
  id: string
  itemId: string
  lastErrorCode: EnrichmentErrorCode | null
  leaseExpiresAt: Date | null
  leaseToken: LeaseToken | null
  originalUrl: string
  status: TestJobStatus
}

type TestEnrichment = {
  itemId: string
  lastErrorCode: EnrichmentErrorCode | null
  metadata: EnrichmentMetadata | null
  nextAttemptAt: Date | null
  state: TestEnrichmentState
}

export class InMemoryEnrichmentQueueRepository implements EnrichmentQueueRepository {
  readonly enrichments = new Map<string, TestEnrichment>()
  readonly jobs = new Map<string, TestJob>()

  seed(input: {
    attemptCount?: number
    availableAt: Date
    id: string
    itemId: string
    leaseExpiresAt?: Date
    leaseToken?: string
    originalUrl: string
    status?: TestJobStatus
  }): void {
    const status = input.status ?? 'pending'
    const leaseToken = input.leaseToken ? toLeaseToken(input.leaseToken) : null
    this.jobs.set(input.id, {
      attemptCount: input.attemptCount ?? 0,
      availableAt: new Date(input.availableAt),
      completedAt: null,
      id: input.id,
      itemId: input.itemId,
      lastErrorCode: null,
      leaseExpiresAt: input.leaseExpiresAt
        ? new Date(input.leaseExpiresAt)
        : null,
      leaseToken,
      originalUrl: input.originalUrl,
      status,
    })
    this.enrichments.set(input.itemId, {
      itemId: input.itemId,
      lastErrorCode: null,
      metadata: null,
      nextAttemptAt: status === 'pending' ? new Date(input.availableAt) : null,
      state: status === 'processing' ? 'processing' : 'pending',
    })
  }

  claimNext: EnrichmentQueueRepository['claimNext'] = (input) => {
    const job = [...this.jobs.values()]
      .filter(
        (candidate) =>
          candidate.status === 'pending' &&
          candidate.availableAt.getTime() <= input.now.getTime(),
      )
      .sort(
        (left, right) =>
          left.availableAt.getTime() - right.availableAt.getTime() ||
          left.id.localeCompare(right.id),
      )[0]

    if (!job) {
      return Promise.resolve(null)
    }

    job.status = 'processing'
    job.attemptCount += 1
    job.leaseToken = input.leaseToken
    job.leaseExpiresAt = new Date(input.leaseExpiresAt)
    job.lastErrorCode = null
    const enrichment = this.requireEnrichment(job.itemId)
    enrichment.state = 'processing'
    enrichment.lastErrorCode = null
    enrichment.nextAttemptAt = null

    return Promise.resolve(this.toClaim(job))
  }

  complete: EnrichmentQueueRepository['complete'] = (input) => {
    const job = this.validLease(input.claim, input.now)
    if (!job) {
      return Promise.resolve(false)
    }

    job.status = 'completed'
    job.completedAt = new Date(input.now)
    job.leaseToken = null
    job.leaseExpiresAt = null
    job.lastErrorCode = null
    const enrichment = this.requireEnrichment(job.itemId)
    enrichment.state = 'succeeded'
    enrichment.metadata = { ...input.metadata }
    enrichment.lastErrorCode = null
    enrichment.nextAttemptAt = null
    return Promise.resolve(true)
  }

  failTerminal: EnrichmentQueueRepository['failTerminal'] = (input) => {
    const job = this.validLease(input.claim, input.now)
    if (!job) {
      return Promise.resolve(false)
    }

    this.markTerminal(job, input.errorCode, input.now)
    return Promise.resolve(true)
  }

  reconcileStale: EnrichmentQueueRepository['reconcileStale'] = (input) => {
    const stale = [...this.jobs.values()]
      .filter(
        (job) =>
          job.status === 'processing' &&
          job.leaseExpiresAt !== null &&
          job.leaseExpiresAt.getTime() <= input.now.getTime(),
      )
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, input.limit)
    const result: ReconciliationResult = { rescheduled: 0, terminal: 0 }

    for (const job of stale) {
      if (job.attemptCount >= input.maxAttempts) {
        this.markTerminal(job, input.errorCode, input.now)
        result.terminal += 1
        continue
      }

      job.status = 'pending'
      job.availableAt = new Date(input.now)
      job.leaseToken = null
      job.leaseExpiresAt = null
      job.lastErrorCode = input.errorCode
      const enrichment = this.requireEnrichment(job.itemId)
      enrichment.state = 'retryable_failed'
      enrichment.lastErrorCode = input.errorCode
      enrichment.nextAttemptAt = new Date(input.now)
      result.rescheduled += 1
    }

    return Promise.resolve(result)
  }

  reschedule: EnrichmentQueueRepository['reschedule'] = (input) => {
    const job = this.validLease(input.claim, input.now)
    if (!job) {
      return Promise.resolve(false)
    }

    job.status = 'pending'
    job.availableAt = new Date(input.availableAt)
    job.leaseToken = null
    job.leaseExpiresAt = null
    job.lastErrorCode = input.errorCode
    const enrichment = this.requireEnrichment(job.itemId)
    enrichment.state = 'retryable_failed'
    enrichment.lastErrorCode = input.errorCode
    enrichment.nextAttemptAt = new Date(input.availableAt)
    return Promise.resolve(true)
  }

  private markTerminal(
    job: TestJob,
    errorCode: EnrichmentErrorCode,
    now: Date,
  ): void {
    job.status = 'dead'
    job.completedAt = new Date(now)
    job.leaseToken = null
    job.leaseExpiresAt = null
    job.lastErrorCode = errorCode
    const enrichment = this.requireEnrichment(job.itemId)
    enrichment.state = 'terminal_failed'
    enrichment.lastErrorCode = errorCode
    enrichment.nextAttemptAt = null
  }

  private requireEnrichment(itemId: string): TestEnrichment {
    const enrichment = this.enrichments.get(itemId)
    if (!enrichment) {
      throw new Error('Test job has no enrichment record.')
    }
    return enrichment
  }

  private toClaim(job: TestJob): ClaimedEnrichmentJob {
    if (!job.leaseExpiresAt || !job.leaseToken) {
      throw new Error('Test job is not leased.')
    }

    return {
      attemptCount: job.attemptCount,
      itemId: toItemId(job.itemId),
      jobId: toEnrichmentJobId(job.id),
      leaseExpiresAt: new Date(job.leaseExpiresAt),
      leaseToken: job.leaseToken,
      originalUrl: job.originalUrl,
    }
  }

  private validLease(claim: ClaimedEnrichmentJob, now: Date): TestJob | null {
    const job = this.jobs.get(claim.jobId)
    if (
      !job ||
      job.status !== 'processing' ||
      job.itemId !== claim.itemId ||
      job.leaseToken !== claim.leaseToken ||
      !job.leaseExpiresAt ||
      job.leaseExpiresAt.getTime() <= now.getTime()
    ) {
      return null
    }
    return job
  }
}
