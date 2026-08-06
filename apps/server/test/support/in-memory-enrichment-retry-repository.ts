import type {
  EnrichmentRetryRepository,
  EnrichmentRetryRepositoryResult,
} from '../../src/modules/enrichment/enrichment-retry.js'
import type {
  ItemEnrichmentRecord,
  ItemId,
  UserId,
} from '../../src/modules/items/item-types.js'

type RetryFixture = {
  enrichment: ItemEnrichmentRecord | null
  hasUrl: boolean
  jobAttemptCount: number
  jobStatus: 'completed' | 'dead' | 'pending' | 'processing' | null
  ownerId: UserId
}

type RateLimit = {
  requestCount: number
  windowStartedAt: Date
}

function cloneEnrichment(
  enrichment: ItemEnrichmentRecord,
): ItemEnrichmentRecord {
  return {
    ...enrichment,
    enrichedAt: enrichment.enrichedAt ? new Date(enrichment.enrichedAt) : null,
    nextAttemptAt: enrichment.nextAttemptAt
      ? new Date(enrichment.nextAttemptAt)
      : null,
  }
}

export class InMemoryEnrichmentRetryRepository implements EnrichmentRetryRepository {
  readonly fixtures = new Map<ItemId, RetryFixture>()
  readonly rateLimits = new Map<UserId, RateLimit>()
  private transactionTail: Promise<void> = Promise.resolve()

  seed(itemId: ItemId, fixture: RetryFixture): void {
    this.fixtures.set(itemId, {
      ...fixture,
      enrichment: fixture.enrichment
        ? cloneEnrichment(fixture.enrichment)
        : null,
    })
  }

  retry(
    input: Parameters<EnrichmentRetryRepository['retry']>[0],
  ): Promise<EnrichmentRetryRepositoryResult> {
    const transaction = this.transactionTail.then(() => this.perform(input))
    this.transactionTail = transaction.then(
      () => undefined,
      () => undefined,
    )
    return transaction
  }

  private perform(
    input: Parameters<EnrichmentRetryRepository['retry']>[0],
  ): EnrichmentRetryRepositoryResult {
    const fixture = this.fixtures.get(input.itemId)
    if (!fixture || fixture.ownerId !== input.actor) {
      return { outcome: 'not_found' }
    }

    const enrichment = fixture.enrichment
    if (!fixture.hasUrl || !enrichment || !fixture.jobStatus) {
      return { outcome: 'invalid_state' }
    }

    const retryable =
      enrichment.state === 'retryable_failed' && fixture.jobStatus === 'pending'
    const terminal =
      enrichment.state === 'terminal_failed' && fixture.jobStatus === 'dead'
    if (!retryable && !terminal) {
      return { outcome: 'invalid_state' }
    }

    const currentLimit = this.rateLimits.get(input.actor)
    const expired =
      !currentLimit ||
      currentLimit.windowStartedAt.getTime() <=
        input.now.getTime() - input.windowMs
    const nextLimit: RateLimit = expired
      ? { requestCount: 1, windowStartedAt: new Date(input.now) }
      : {
          requestCount: Math.min(
            currentLimit.requestCount + 1,
            input.maxRequests + 1,
          ),
          windowStartedAt: new Date(currentLimit.windowStartedAt),
        }
    this.rateLimits.set(input.actor, nextLimit)

    if (nextLimit.requestCount > input.maxRequests) {
      return {
        outcome: 'rate_limited',
        retryAfterSeconds: Math.max(
          1,
          Math.ceil(
            (nextLimit.windowStartedAt.getTime() +
              input.windowMs -
              input.now.getTime()) /
              1_000,
          ),
        ),
      }
    }

    const attemptCount = terminal ? 0 : fixture.jobAttemptCount
    const reset: ItemEnrichmentRecord = {
      attemptCount,
      canonicalUrl: null,
      description: null,
      enrichedAt: null,
      extractedTitle: null,
      faviconUrl: null,
      imageUrl: null,
      lastErrorCode: null,
      nextAttemptAt: new Date(input.now),
      provider: null,
      siteName: null,
      state: 'pending',
    }
    fixture.enrichment = reset
    fixture.jobAttemptCount = attemptCount
    fixture.jobStatus = 'pending'

    return { enrichment: cloneEnrichment(reset), outcome: 'retried' }
  }
}
