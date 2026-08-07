import type { DatabaseConnection } from '@cerebero/db'
import { enrichmentErrorCodeSchema } from '@cerebero/contracts'
import {
  enrichmentJobs,
  itemEnrichments,
  itemTags,
  items as itemsTable,
  tags as tagsTable,
} from '@cerebero/db/schema'
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm'

import type { TagSummary } from '../tags/tag-types.js'
import { toTagId } from '../tags/tag-types.js'
import type { ItemId, ItemRecord, ItemRepository, UserId } from './item-types.js'
import { toItemId, toUserId } from './item-types.js'

type ItemRow = typeof itemsTable.$inferSelect
type ItemEnrichmentRow = typeof itemEnrichments.$inferSelect

function toItemRecord(
  row: ItemRow,
  enrichment: ItemEnrichmentRow | null,
  tags: readonly TagSummary[] = [],
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
    tags,
    trashedAt: row.trashedAt,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

export function createDrizzleItemsRepository(
  connection: DatabaseConnection,
): ItemRepository {
  const database = connection.database

  async function loadTagsByItemIds(
    ownerId: UserId,
    itemIds: readonly ItemId[],
  ): Promise<Map<ItemId, TagSummary[]>> {
    const tagsByItemId = new Map<ItemId, TagSummary[]>()
    for (const itemId of itemIds) {
      tagsByItemId.set(itemId, [])
    }

    if (itemIds.length === 0) {
      return tagsByItemId
    }

    const rows = await database
      .select({
        createdAt: tagsTable.createdAt,
        id: tagsTable.id,
        itemId: itemTags.itemId,
        name: tagsTable.name,
      })
      .from(itemTags)
      .innerJoin(tagsTable, eq(tagsTable.id, itemTags.tagId))
      .where(
        and(
          eq(itemTags.ownerId, ownerId),
          inArray(itemTags.itemId, [...itemIds]),
          eq(tagsTable.ownerId, ownerId),
        ),
      )
      .orderBy(asc(tagsTable.normalizedName), asc(tagsTable.id))

    for (const row of rows) {
      const itemId = toItemId(row.itemId)
      const current = tagsByItemId.get(itemId) ?? []
      current.push({
        createdAt: row.createdAt,
        id: toTagId(row.id),
        name: row.name,
      })
      tagsByItemId.set(itemId, current)
    }

    return tagsByItemId
  }

  async function withTags(
    ownerId: UserId,
    records: readonly {
      enrichment: ItemEnrichmentRow | null
      item: ItemRow
    }[],
  ): Promise<ItemRecord[]> {
    const itemIds = records.map((record) => toItemId(record.item.id))
    const tagsByItemId = await loadTagsByItemIds(ownerId, itemIds)
    return records.map((record) =>
      toItemRecord(
        record.item,
        record.enrichment,
        tagsByItemId.get(toItemId(record.item.id)) ?? [],
      ),
    )
  }

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

        return toItemRecord(result.item, result.enrichment, [])
      }),

    deletePermanently: async (ownerId, itemId, expectedVersion) => {
      const deleted = await database
        .delete(itemsTable)
        .where(
          and(
            eq(itemsTable.ownerId, ownerId),
            eq(itemsTable.id, itemId),
            eq(itemsTable.version, expectedVersion),
            eq(itemsTable.status, 'trashed'),
          ),
        )
        .returning({ id: itemsTable.id })

      return deleted.length > 0
    },

    findById: async (ownerId, itemId) => {
      const [record] = await database
        .select({ enrichment: itemEnrichments, item: itemsTable })
        .from(itemsTable)
        .leftJoin(itemEnrichments, eq(itemEnrichments.itemId, itemsTable.id))
        .where(and(eq(itemsTable.ownerId, ownerId), eq(itemsTable.id, itemId)))
        .limit(1)

      if (!record) {
        return null
      }

      const [hydrated] = await withTags(ownerId, [record])
      return hydrated ?? null
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

      return withTags(ownerId, records)
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

      const kindCondition =
        options.kind === 'link'
          ? isNotNull(itemsTable.originalUrl)
          : options.kind === 'note'
            ? isNull(itemsTable.originalUrl)
            : undefined

      const pinnedCondition =
        options.pinned === true
          ? isNotNull(itemsTable.pinnedAt)
          : options.pinned === false
            ? isNull(itemsTable.pinnedAt)
            : undefined

      const tagCondition =
        options.tagIds && options.tagIds.length > 0
          ? inArray(
              itemsTable.id,
              database
                .select({ itemId: itemTags.itemId })
                .from(itemTags)
                .where(
                  and(
                    eq(itemTags.ownerId, ownerId),
                    inArray(itemTags.tagId, [...options.tagIds]),
                  ),
                )
                .groupBy(itemTags.itemId)
                .having(
                  sql`count(distinct ${itemTags.tagId}) = ${options.tagIds.length}`,
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
            kindCondition,
            pinnedCondition,
            tagCondition,
          ),
        )
        .orderBy(desc(itemsTable.createdAt), desc(itemsTable.id))
        .limit(options.limit)

      return withTags(ownerId, records)
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

        const tagsByItemId = await loadTagsByItemIds(ownerId, [itemId])
        return toItemRecord(
          result.item,
          result.enrichment,
          tagsByItemId.get(itemId) ?? [],
        )
      }),
  }
}
