import type { DatabaseConnection } from '@cerebero/db'
import {
  enrichmentJobs,
  enrichmentRetryRateLimits,
  itemEnrichments,
  items,
} from '@cerebero/db/schema'
import { and, eq, sql } from 'drizzle-orm'

import type { EnrichmentRetryRepository } from './enrichment-retry.js'

export function createDrizzleEnrichmentRetryRepository(
  connection: DatabaseConnection,
): EnrichmentRetryRepository {
  const database = connection.database

  return {
    retry: (input) =>
      database.transaction(async (transaction) => {
        const [ownedItem] = await transaction
          .select({ originalUrl: items.originalUrl })
          .from(items)
          .where(
            and(eq(items.id, input.itemId), eq(items.ownerId, input.actor)),
          )
          .for('update')
          .limit(1)

        if (!ownedItem) {
          return { outcome: 'not_found' as const }
        }
        if (!ownedItem.originalUrl) {
          return { outcome: 'invalid_state' as const }
        }

        const [work] = await transaction
          .select({ enrichment: itemEnrichments, job: enrichmentJobs })
          .from(itemEnrichments)
          .innerJoin(
            enrichmentJobs,
            eq(enrichmentJobs.itemId, itemEnrichments.itemId),
          )
          .where(eq(itemEnrichments.itemId, input.itemId))
          .for('update')
          .limit(1)

        if (!work) {
          throw new Error('The Item enrichment queue records are missing.')
        }

        const retryable =
          work.enrichment.state === 'retryable_failed' &&
          work.job.status === 'pending'
        const terminal =
          work.enrichment.state === 'terminal_failed' &&
          work.job.status === 'dead'
        if (!retryable && !terminal) {
          return { outcome: 'invalid_state' as const }
        }

        const windowCutoff = new Date(input.now.getTime() - input.windowMs)
        const [rateLimit] = await transaction
          .insert(enrichmentRetryRateLimits)
          .values({
            ownerId: input.actor,
            requestCount: 1,
            updatedAt: input.now,
            windowStartedAt: input.now,
          })
          .onConflictDoUpdate({
            set: {
              requestCount: sql<number>`case
                when ${enrichmentRetryRateLimits.windowStartedAt} <= ${windowCutoff}
                  then 1
                else least(${enrichmentRetryRateLimits.requestCount} + 1, ${input.maxRequests + 1})
              end`,
              updatedAt: input.now,
              windowStartedAt: sql<Date>`case
                when ${enrichmentRetryRateLimits.windowStartedAt} <= ${windowCutoff}
                  then ${input.now}
                else ${enrichmentRetryRateLimits.windowStartedAt}
              end`,
            },
            target: enrichmentRetryRateLimits.ownerId,
          })
          .returning({
            requestCount: enrichmentRetryRateLimits.requestCount,
            windowStartedAt: enrichmentRetryRateLimits.windowStartedAt,
          })

        if (!rateLimit) {
          throw new Error('The enrichment retry quota update returned no row.')
        }

        if (rateLimit.requestCount > input.maxRequests) {
          const resetAt = rateLimit.windowStartedAt.getTime() + input.windowMs
          return {
            outcome: 'rate_limited' as const,
            retryAfterSeconds: Math.max(
              1,
              Math.ceil((resetAt - input.now.getTime()) / 1_000),
            ),
          }
        }

        const attemptCount = terminal ? 0 : work.job.attemptCount
        await transaction
          .update(enrichmentJobs)
          .set({
            attemptCount,
            availableAt: input.now,
            claimedAt: null,
            completedAt: null,
            lastErrorCode: null,
            leaseExpiresAt: null,
            leaseToken: null,
            status: 'pending',
            updatedAt: input.now,
          })
          .where(eq(enrichmentJobs.id, work.job.id))

        const [enrichment] = await transaction
          .update(itemEnrichments)
          .set({
            attemptCount,
            canonicalUrl: null,
            description: null,
            enrichedAt: null,
            extractedTitle: null,
            faviconUrl: null,
            imageUrl: null,
            lastErrorCode: null,
            nextAttemptAt: input.now,
            provider: null,
            siteName: null,
            state: 'pending',
            updatedAt: input.now,
          })
          .where(eq(itemEnrichments.itemId, input.itemId))
          .returning()

        if (!enrichment) {
          throw new Error('The retried enrichment update returned no row.')
        }

        return {
          enrichment: {
            attemptCount: enrichment.attemptCount,
            canonicalUrl: enrichment.canonicalUrl,
            description: enrichment.description,
            enrichedAt: enrichment.enrichedAt,
            extractedTitle: enrichment.extractedTitle,
            faviconUrl: enrichment.faviconUrl,
            imageUrl: enrichment.imageUrl,
            lastErrorCode: null,
            nextAttemptAt: enrichment.nextAttemptAt,
            provider: enrichment.provider,
            siteName: enrichment.siteName,
            state: enrichment.state,
          },
          outcome: 'retried' as const,
        }
      }),
  }
}
