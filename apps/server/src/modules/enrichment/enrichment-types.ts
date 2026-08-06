import {
  ENRICHMENT_ERROR_CODES,
  type EnrichmentErrorCode,
} from '@cerebero/contracts'

import type { ItemId } from '../items/item-types.js'

export { ENRICHMENT_ERROR_CODES, type EnrichmentErrorCode }

declare const enrichmentJobIdBrand: unique symbol
declare const leaseTokenBrand: unique symbol

export type EnrichmentJobId = string & {
  readonly [enrichmentJobIdBrand]: true
}
export type LeaseToken = string & { readonly [leaseTokenBrand]: true }

export function toEnrichmentJobId(value: string): EnrichmentJobId {
  return value as EnrichmentJobId
}

export function toLeaseToken(value: string): LeaseToken {
  return value as LeaseToken
}

export type EnrichmentMetadata = {
  canonicalUrl: string | null
  description: string | null
  extractedTitle: string | null
  faviconUrl: string | null
  imageUrl: string | null
  provider: string | null
  siteName: string | null
}

export type ClaimedEnrichmentJob = {
  attemptCount: number
  itemId: ItemId
  jobId: EnrichmentJobId
  leaseExpiresAt: Date
  leaseToken: LeaseToken
  originalUrl: string
}

export type EnrichmentFailure = {
  code: EnrichmentErrorCode
  retryable: boolean
}

export type EnrichmentFailureResult =
  { availableAt: Date; outcome: 'rescheduled' } | { outcome: 'terminal' }

export type ReconciliationResult = {
  rescheduled: number
  terminal: number
}

export interface EnrichmentQueueRepository {
  claimNext: (input: {
    leaseExpiresAt: Date
    leaseToken: LeaseToken
    now: Date
  }) => Promise<ClaimedEnrichmentJob | null>
  complete: (input: {
    claim: ClaimedEnrichmentJob
    metadata: EnrichmentMetadata
    now: Date
  }) => Promise<boolean>
  failTerminal: (input: {
    claim: ClaimedEnrichmentJob
    errorCode: EnrichmentErrorCode
    now: Date
  }) => Promise<boolean>
  reconcileStale: (input: {
    errorCode: 'lease_expired'
    limit: number
    maxAttempts: number
    now: Date
  }) => Promise<ReconciliationResult>
  reschedule: (input: {
    availableAt: Date
    claim: ClaimedEnrichmentJob
    errorCode: EnrichmentErrorCode
    now: Date
  }) => Promise<boolean>
}

export interface EnrichmentQueue {
  claimNext: () => Promise<ClaimedEnrichmentJob | null>
  complete: (
    claim: ClaimedEnrichmentJob,
    metadata: EnrichmentMetadata,
  ) => Promise<void>
  fail: (
    claim: ClaimedEnrichmentJob,
    failure: EnrichmentFailure,
  ) => Promise<EnrichmentFailureResult>
  reconcileStale: (limit?: number) => Promise<ReconciliationResult>
}

export class EnrichmentQueueError extends Error {
  readonly code: 'INVALID_METADATA' | 'LEASE_LOST'

  constructor(code: 'INVALID_METADATA' | 'LEASE_LOST', message: string) {
    super(message)
    this.name = 'EnrichmentQueueError'
    this.code = code
  }
}
