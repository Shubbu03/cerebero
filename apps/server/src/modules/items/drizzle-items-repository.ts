import type { DatabaseConnection } from '@cerebero/db'
import { enrichmentErrorCodeSchema } from '@cerebero/contracts'
import {
  enrichmentJobs,
  itemEnrichments,
  items as itemsTable,
} from '@cerebero/db/schema'
import { and, desc, eq, lt, ne, or, sql } from 'drizzle-orm'

import type { ItemRecord, ItemRepository } from './item-types.js'
import { toItemId, toUserId } from './item-types.js'

type ItemRow = typeof itemsTable.$inferSelect
type ItemEnrichmentRow = typeof itemEnrichments.$inferSelect

function toItemRecord(
  row: ItemRow,
  enrichment: ItemEnrichmentRow | null,
): ItemRecord {
  return {
    authoredTitle: row.authoredTitle,
    createdAt: row.createdAt,
    enrichment: enrichment
      ? {
          attemptCount: enrichment.attemptCount,
          canonicalUrl: enrichment.canonicalUrl,
          description: enrichment.description,
          enrichedAt: enrichment.enrichedAt,
          extractedTitle: enrichment.extractedTitle,
          faviconUrl: enrichment.faviconUrl,
          imageUrl: enrichment.imageUrl,
          lastErrorCode: enrichmentErrorCodeSchema
            .nullable()
            .parse(enrichment.lastErrorCode),
          nextAttemptAt: enrichment.nextAttemptAt,
          provider: enrichment.provider,
          siteName: enrichment.siteName,
          state: enrichment.state,
        }
      : null,
    id: toItemId(row.id),
    normalizedUrl: row.normalizedUrl,
    noteMarkdown: row.noteMarkdown,
    originalUrl: row.originalUrl,
    ownerId: toUserId(row.ownerId),
    pinnedAt: row.pinnedAt,
    status: row.status,
    trashedAt: row.trashedAt,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

export function createDrizzleItemsRepository(
  connection: DatabaseConnection,
): ItemRepository {
  const database = connection.database

  return {
    createCapture: (record) =>
      database.transaction(async (transaction) => {
        const itemValues = {
          authoredTitle: record.authoredTitle,
          createdAt: record.createdAt,
          id: record.id,
          normalizedUrl: record.normalizedUrl,
          noteMarkdown: record.noteMarkdown,
          originalUrl: record.originalUrl,
          ownerId: record.ownerId,
          pinnedAt: record.pinnedAt,
          status: record.status,
          trashedAt: record.trashedAt,
          updatedAt: record.updatedAt,
          version: record.version,
        }
        const [created] = await transaction
          .insert(itemsTable)
          .values(itemValues)
          .returning()

        if (!created) {
          throw new Error('The Item insert returned no record.')
        }

        if (record.originalUrl) {
          await transaction.insert(itemEnrichments).values({
            createdAt: record.createdAt,
            itemId: record.id,
            nextAttemptAt: record.createdAt,
            state: 'pending',
            updatedAt: record.updatedAt,
          })
          await transaction.insert(enrichmentJobs).values({
            availableAt: record.createdAt,
            createdAt: record.createdAt,
            itemId: record.id,
            status: 'pending',
            updatedAt: record.updatedAt,
          })
        }

        const [result] = await transaction
          .select({ enrichment: itemEnrichments, item: itemsTable })
          .from(itemsTable)
          .leftJoin(itemEnrichments, eq(itemEnrichments.itemId, itemsTable.id))
          .where(eq(itemsTable.id, created.id))
          .limit(1)

        if (!result) {
          throw new Error('The created Item could not be reloaded.')
        }

        return toItemRecord(result.item, result.enrichment)
      }),

    findById: async (ownerId, itemId) => {
      const [record] = await database
        .select({ enrichment: itemEnrichments, item: itemsTable })
        .from(itemsTable)
        .leftJoin(itemEnrichments, eq(itemEnrichments.itemId, itemsTable.id))
        .where(and(eq(itemsTable.ownerId, ownerId), eq(itemsTable.id, itemId)))
        .limit(1)

      return record ? toItemRecord(record.item, record.enrichment) : null
    },

    findDuplicates: async (ownerId, normalizedUrl, limit) => {
      const records = await database
        .select({ enrichment: itemEnrichments, item: itemsTable })
        .from(itemsTable)
        .leftJoin(itemEnrichments, eq(itemEnrichments.itemId, itemsTable.id))
        .where(
          and(
            eq(itemsTable.ownerId, ownerId),
            eq(itemsTable.normalizedUrl, normalizedUrl),
            ne(itemsTable.status, 'trashed'),
          ),
        )
        .orderBy(desc(itemsTable.createdAt), desc(itemsTable.id))
        .limit(limit)

      return records.map((record) =>
        toItemRecord(record.item, record.enrichment),
      )
    },

    list: async (ownerId, options) => {
      const cursorCondition = options.cursor
        ? or(
            lt(itemsTable.createdAt, options.cursor.createdAt),
            and(
              eq(itemsTable.createdAt, options.cursor.createdAt),
              lt(itemsTable.id, options.cursor.id),
            ),
          )
        : undefined

      const records = await database
        .select({ enrichment: itemEnrichments, item: itemsTable })
        .from(itemsTable)
        .leftJoin(itemEnrichments, eq(itemEnrichments.itemId, itemsTable.id))
        .where(
          and(
            eq(itemsTable.ownerId, ownerId),
            eq(itemsTable.status, options.status),
            cursorCondition,
          ),
        )
        .orderBy(desc(itemsTable.createdAt), desc(itemsTable.id))
        .limit(options.limit)

      return records.map((record) =>
        toItemRecord(record.item, record.enrichment),
      )
    },

    update: (ownerId, itemId, expectedVersion, patch, enrichmentMode) =>
      database.transaction(async (transaction) => {
        const records = await transaction
          .update(itemsTable)
          .set({
            ...patch,
            version: sql`${itemsTable.version} + 1`,
          })
          .where(
            and(
              eq(itemsTable.ownerId, ownerId),
              eq(itemsTable.id, itemId),
              eq(itemsTable.version, expectedVersion),
            ),
          )
          .returning()

        const updated = records[0]
        if (!updated) {
          return null
        }

        if (enrichmentMode === 'remove' || enrichmentMode === 'reset') {
          await transaction
            .delete(enrichmentJobs)
            .where(eq(enrichmentJobs.itemId, itemId))
          await transaction
            .delete(itemEnrichments)
            .where(eq(itemEnrichments.itemId, itemId))
        }

        if (enrichmentMode === 'reset') {
          const scheduledAt = patch.updatedAt ?? updated.updatedAt
          await transaction.insert(itemEnrichments).values({
            createdAt: scheduledAt,
            itemId,
            nextAttemptAt: scheduledAt,
            state: 'pending',
            updatedAt: scheduledAt,
          })
          await transaction.insert(enrichmentJobs).values({
            availableAt: scheduledAt,
            createdAt: scheduledAt,
            itemId,
            status: 'pending',
            updatedAt: scheduledAt,
          })
        }

        const [result] = await transaction
          .select({ enrichment: itemEnrichments, item: itemsTable })
          .from(itemsTable)
          .leftJoin(itemEnrichments, eq(itemEnrichments.itemId, itemsTable.id))
          .where(eq(itemsTable.id, updated.id))
          .limit(1)

        if (!result) {
          throw new Error('The updated Item could not be reloaded.')
        }

        return toItemRecord(result.item, result.enrichment)
      }),
  }
}
