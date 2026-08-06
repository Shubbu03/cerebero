import type { DatabaseConnection } from '@cerebero/db'
import {
  enrichmentJobs,
  itemEnrichments,
  items as itemsTable,
} from '@cerebero/db/schema'
import { and, desc, eq, lt, ne, or, sql } from 'drizzle-orm'

import type { ItemRecord, ItemRepository } from './item-types.js'
import { toItemId, toUserId } from './item-types.js'

type ItemRow = typeof itemsTable.$inferSelect

function toItemRecord(row: ItemRow): ItemRecord {
  return {
    authoredTitle: row.authoredTitle,
    createdAt: row.createdAt,
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
        const [created] = await transaction
          .insert(itemsTable)
          .values(record)
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

        return toItemRecord(created)
      }),

    findById: async (ownerId, itemId) => {
      const [record] = await database
        .select()
        .from(itemsTable)
        .where(and(eq(itemsTable.ownerId, ownerId), eq(itemsTable.id, itemId)))
        .limit(1)

      return record ? toItemRecord(record) : null
    },

    findDuplicates: async (ownerId, normalizedUrl, limit) => {
      const records = await database
        .select()
        .from(itemsTable)
        .where(
          and(
            eq(itemsTable.ownerId, ownerId),
            eq(itemsTable.normalizedUrl, normalizedUrl),
            ne(itemsTable.status, 'trashed'),
          ),
        )
        .orderBy(desc(itemsTable.createdAt), desc(itemsTable.id))
        .limit(limit)

      return records.map(toItemRecord)
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
        .select()
        .from(itemsTable)
        .where(
          and(
            eq(itemsTable.ownerId, ownerId),
            eq(itemsTable.status, options.status),
            cursorCondition,
          ),
        )
        .orderBy(desc(itemsTable.createdAt), desc(itemsTable.id))
        .limit(options.limit)

      return records.map(toItemRecord)
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

        return toItemRecord(updated)
      }),
  }
}
