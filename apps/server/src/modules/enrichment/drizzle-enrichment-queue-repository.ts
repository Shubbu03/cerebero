import type { DatabaseConnection } from '@cerebero/db'
import {
  enrichmentJobs,
  itemEnrichments,
  items as itemsTable,
} from '@cerebero/db/schema'
import { and, asc, eq, gt, inArray, isNotNull, lte, sql } from 'drizzle-orm'

import type {
  ClaimedEnrichmentJob,
  EnrichmentQueueRepository,
} from './enrichment-types.js'
import { toEnrichmentJobId, toLeaseToken } from './enrichment-types.js'
import { toItemId } from '../items/item-types.js'

function requireClaimedJob(input: {
  attemptCount: number
  itemId: string
  jobId: string
  leaseExpiresAt: Date | null
  leaseToken: string | null
  originalUrl: string | null
}): ClaimedEnrichmentJob {
  if (!input.leaseExpiresAt || !input.leaseToken || !input.originalUrl) {
    throw new Error('A claimed enrichment job violated its data invariants.')
  }

  return {
    attemptCount: input.attemptCount,
    itemId: toItemId(input.itemId),
    jobId: toEnrichmentJobId(input.jobId),
    leaseExpiresAt: input.leaseExpiresAt,
    leaseToken: toLeaseToken(input.leaseToken),
    originalUrl: input.originalUrl,
  }
}

export function createDrizzleEnrichmentQueueRepository(
  connection: DatabaseConnection,
): EnrichmentQueueRepository {
  const database = connection.database

  return {
    claimNext: ({ leaseExpiresAt, leaseToken, now }) =>
      database.transaction(async (transaction) => {
        const [candidate] = await transaction
          .select({
            itemId: enrichmentJobs.itemId,
            jobId: enrichmentJobs.id,
            originalUrl: itemsTable.originalUrl,
          })
          .from(enrichmentJobs)
          .innerJoin(itemsTable, eq(itemsTable.id, enrichmentJobs.itemId))
          .where(
            and(
              eq(enrichmentJobs.status, 'pending'),
              lte(enrichmentJobs.availableAt, now),
              isNotNull(itemsTable.originalUrl),
            ),
          )
          .orderBy(
            asc(enrichmentJobs.availableAt),
            asc(enrichmentJobs.createdAt),
            asc(enrichmentJobs.id),
          )
          .limit(1)
          .for('update', { of: enrichmentJobs, skipLocked: true })

        if (!candidate) {
          return null
        }

        const [claimed] = await transaction
          .update(enrichmentJobs)
          .set({
            attemptCount: sql`${enrichmentJobs.attemptCount} + 1`,
            claimedAt: now,
            lastErrorCode: null,
            leaseExpiresAt,
            leaseToken,
            status: 'processing',
            updatedAt: now,
          })
          .where(
            and(
              eq(enrichmentJobs.id, candidate.jobId),
              eq(enrichmentJobs.status, 'pending'),
            ),
          )
          .returning({
            attemptCount: enrichmentJobs.attemptCount,
            itemId: enrichmentJobs.itemId,
            jobId: enrichmentJobs.id,
            leaseExpiresAt: enrichmentJobs.leaseExpiresAt,
            leaseToken: enrichmentJobs.leaseToken,
          })

        if (!claimed) {
          throw new Error('The locked enrichment job could not be claimed.')
        }

        const [enrichment] = await transaction
          .update(itemEnrichments)
          .set({
            attemptCount: claimed.attemptCount,
            lastErrorCode: null,
            nextAttemptAt: null,
            state: 'processing',
            updatedAt: now,
          })
          .where(
            and(
              eq(itemEnrichments.itemId, claimed.itemId),
              inArray(itemEnrichments.state, ['pending', 'retryable_failed']),
            ),
          )
          .returning({ itemId: itemEnrichments.itemId })

        if (!enrichment) {
          throw new Error('The claimed job has no enrichment record.')
        }

        return requireClaimedJob({
          ...claimed,
          originalUrl: candidate.originalUrl,
        })
      }),

    complete: ({ claim, metadata, now }) =>
      database.transaction(async (transaction) => {
        const [completed] = await transaction
          .update(enrichmentJobs)
          .set({
            claimedAt: null,
            completedAt: now,
            lastErrorCode: null,
            leaseExpiresAt: null,
            leaseToken: null,
            status: 'completed',
            updatedAt: now,
          })
          .where(
            and(
              eq(enrichmentJobs.id, claim.jobId),
              eq(enrichmentJobs.itemId, claim.itemId),
              eq(enrichmentJobs.status, 'processing'),
              eq(enrichmentJobs.leaseToken, claim.leaseToken),
              gt(enrichmentJobs.leaseExpiresAt, now),
            ),
          )
          .returning({ itemId: enrichmentJobs.itemId })

        if (!completed) {
          return false
        }

        const [enrichment] = await transaction
          .update(itemEnrichments)
          .set({
            ...metadata,
            enrichedAt: now,
            lastErrorCode: null,
            nextAttemptAt: null,
            state: 'succeeded',
            updatedAt: now,
          })
          .where(
            and(
              eq(itemEnrichments.itemId, completed.itemId),
              eq(itemEnrichments.state, 'processing'),
            ),
          )
          .returning({ itemId: itemEnrichments.itemId })

        if (!enrichment) {
          throw new Error('The completed job has no processing enrichment.')
        }

        return true
      }),

    failTerminal: ({ claim, errorCode, now }) =>
      database.transaction(async (transaction) => {
        const [failed] = await transaction
          .update(enrichmentJobs)
          .set({
            claimedAt: null,
            completedAt: now,
            lastErrorCode: errorCode,
            leaseExpiresAt: null,
            leaseToken: null,
            status: 'dead',
            updatedAt: now,
          })
          .where(
            and(
              eq(enrichmentJobs.id, claim.jobId),
              eq(enrichmentJobs.itemId, claim.itemId),
              eq(enrichmentJobs.status, 'processing'),
              eq(enrichmentJobs.leaseToken, claim.leaseToken),
              gt(enrichmentJobs.leaseExpiresAt, now),
            ),
          )
          .returning({ itemId: enrichmentJobs.itemId })

        if (!failed) {
          return false
        }

        const [enrichment] = await transaction
          .update(itemEnrichments)
          .set({
            lastErrorCode: errorCode,
            nextAttemptAt: null,
            state: 'terminal_failed',
            updatedAt: now,
          })
          .where(
            and(
              eq(itemEnrichments.itemId, failed.itemId),
              eq(itemEnrichments.state, 'processing'),
            ),
          )
          .returning({ itemId: itemEnrichments.itemId })

        if (!enrichment) {
          throw new Error('The failed job has no processing enrichment.')
        }

        return true
      }),

    reschedule: ({ availableAt, claim, errorCode, now }) =>
      database.transaction(async (transaction) => {
        const [rescheduled] = await transaction
          .update(enrichmentJobs)
          .set({
            availableAt,
            claimedAt: null,
            lastErrorCode: errorCode,
            leaseExpiresAt: null,
            leaseToken: null,
            status: 'pending',
            updatedAt: now,
          })
          .where(
            and(
              eq(enrichmentJobs.id, claim.jobId),
              eq(enrichmentJobs.itemId, claim.itemId),
              eq(enrichmentJobs.status, 'processing'),
              eq(enrichmentJobs.leaseToken, claim.leaseToken),
              gt(enrichmentJobs.leaseExpiresAt, now),
            ),
          )
          .returning({ itemId: enrichmentJobs.itemId })

        if (!rescheduled) {
          return false
        }

        const [enrichment] = await transaction
          .update(itemEnrichments)
          .set({
            lastErrorCode: errorCode,
            nextAttemptAt: availableAt,
            state: 'retryable_failed',
            updatedAt: now,
          })
          .where(
            and(
              eq(itemEnrichments.itemId, rescheduled.itemId),
              eq(itemEnrichments.state, 'processing'),
            ),
          )
          .returning({ itemId: itemEnrichments.itemId })

        if (!enrichment) {
          throw new Error('The rescheduled job has no processing enrichment.')
        }

        return true
      }),

    reconcileStale: ({ errorCode, limit, maxAttempts, now }) =>
      database.transaction(async (transaction) => {
        const staleJobs = await transaction
          .select({
            attemptCount: enrichmentJobs.attemptCount,
            itemId: enrichmentJobs.itemId,
            jobId: enrichmentJobs.id,
          })
          .from(enrichmentJobs)
          .where(
            and(
              eq(enrichmentJobs.status, 'processing'),
              lte(enrichmentJobs.leaseExpiresAt, now),
            ),
          )
          .orderBy(asc(enrichmentJobs.leaseExpiresAt), asc(enrichmentJobs.id))
          .limit(limit)
          .for('update', { of: enrichmentJobs, skipLocked: true })

        const terminalJobs = staleJobs.filter(
          (job) => job.attemptCount >= maxAttempts,
        )
        const retryableJobs = staleJobs.filter(
          (job) => job.attemptCount < maxAttempts,
        )

        if (retryableJobs.length > 0) {
          const jobIds = retryableJobs.map((job) => job.jobId)
          const itemIds = retryableJobs.map((job) => job.itemId)
          await transaction
            .update(enrichmentJobs)
            .set({
              availableAt: now,
              claimedAt: null,
              lastErrorCode: errorCode,
              leaseExpiresAt: null,
              leaseToken: null,
              status: 'pending',
              updatedAt: now,
            })
            .where(inArray(enrichmentJobs.id, jobIds))
          const rescheduledEnrichments = await transaction
            .update(itemEnrichments)
            .set({
              lastErrorCode: errorCode,
              nextAttemptAt: now,
              state: 'retryable_failed',
              updatedAt: now,
            })
            .where(
              and(
                inArray(itemEnrichments.itemId, itemIds),
                eq(itemEnrichments.state, 'processing'),
              ),
            )
            .returning({ itemId: itemEnrichments.itemId })
          if (rescheduledEnrichments.length !== retryableJobs.length) {
            throw new Error(
              'Stale retryable jobs did not match their enrichment records.',
            )
          }
        }

        if (terminalJobs.length > 0) {
          const jobIds = terminalJobs.map((job) => job.jobId)
          const itemIds = terminalJobs.map((job) => job.itemId)
          await transaction
            .update(enrichmentJobs)
            .set({
              claimedAt: null,
              completedAt: now,
              lastErrorCode: errorCode,
              leaseExpiresAt: null,
              leaseToken: null,
              status: 'dead',
              updatedAt: now,
            })
            .where(inArray(enrichmentJobs.id, jobIds))
          const terminalEnrichments = await transaction
            .update(itemEnrichments)
            .set({
              lastErrorCode: errorCode,
              nextAttemptAt: null,
              state: 'terminal_failed',
              updatedAt: now,
            })
            .where(
              and(
                inArray(itemEnrichments.itemId, itemIds),
                eq(itemEnrichments.state, 'processing'),
              ),
            )
            .returning({ itemId: itemEnrichments.itemId })
          if (terminalEnrichments.length !== terminalJobs.length) {
            throw new Error(
              'Stale terminal jobs did not match their enrichment records.',
            )
          }
        }

        return {
          rescheduled: retryableJobs.length,
          terminal: terminalJobs.length,
        }
      }),
  }
}
