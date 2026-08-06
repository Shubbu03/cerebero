import type { EnrichmentView } from '@cerebero/contracts'

import type {
  ItemEnrichmentRecord,
  ItemId,
  UserId,
} from '../items/item-types.js'

export const ENRICHMENT_RETRY_LIMIT = 5
export const ENRICHMENT_RETRY_WINDOW_MS = 60 * 60 * 1_000

export type EnrichmentRetryRepositoryResult =
  | { outcome: 'invalid_state' }
  | { outcome: 'not_found' }
  | { outcome: 'rate_limited'; retryAfterSeconds: number }
  | { enrichment: ItemEnrichmentRecord; outcome: 'retried' }

export interface EnrichmentRetryRepository {
  retry: (input: {
    actor: UserId
    itemId: ItemId
    maxRequests: number
    now: Date
    windowMs: number
  }) => Promise<EnrichmentRetryRepositoryResult>
}

export interface EnrichmentRetryModule {
  retry: (actor: UserId, itemId: ItemId) => Promise<EnrichmentView>
}

export type EnrichmentRetryErrorCode =
  'INVALID_ITEM_STATE' | 'NOT_FOUND' | 'RATE_LIMITED'

export class EnrichmentRetryError extends Error {
  readonly code: EnrichmentRetryErrorCode
  readonly retryAfterSeconds: number | null

  constructor(
    code: EnrichmentRetryErrorCode,
    message: string,
    retryAfterSeconds: number | null = null,
  ) {
    super(message)
    this.name = 'EnrichmentRetryError'
    this.code = code
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function toEnrichmentView(record: ItemEnrichmentRecord): EnrichmentView {
  return {
    ...record,
    enrichedAt: record.enrichedAt?.toISOString() ?? null,
    nextAttemptAt: record.nextAttemptAt?.toISOString() ?? null,
  }
}

export function createEnrichmentRetryModule(options: {
  clock?: () => Date
  maxRequests?: number
  repository: EnrichmentRetryRepository
  windowMs?: number
}): EnrichmentRetryModule {
  const clock = options.clock ?? (() => new Date())
  const maxRequests = options.maxRequests ?? ENRICHMENT_RETRY_LIMIT
  const windowMs = options.windowMs ?? ENRICHMENT_RETRY_WINDOW_MS

  if (!Number.isSafeInteger(maxRequests) || maxRequests < 1) {
    throw new Error('The enrichment retry limit must be a positive integer.')
  }
  if (!Number.isSafeInteger(windowMs) || windowMs < 1_000) {
    throw new Error('The enrichment retry window must be at least one second.')
  }

  return {
    retry: async (actor, itemId) => {
      const result = await options.repository.retry({
        actor,
        itemId,
        maxRequests,
        now: clock(),
        windowMs,
      })

      switch (result.outcome) {
        case 'retried':
          return toEnrichmentView(result.enrichment)
        case 'not_found':
          throw new EnrichmentRetryError(
            'NOT_FOUND',
            'The requested Item was not found.',
          )
        case 'invalid_state':
          throw new EnrichmentRetryError(
            'INVALID_ITEM_STATE',
            'Enrichment cannot be retried in its current state.',
          )
        case 'rate_limited':
          throw new EnrichmentRetryError(
            'RATE_LIMITED',
            'Too many enrichment retries were requested. Try again later.',
            result.retryAfterSeconds,
          )
      }
    },
  }
}
