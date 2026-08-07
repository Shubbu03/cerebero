import type { DatabaseConnection } from '@cerebero/db'
import { enrichmentErrorCodeSchema } from '@cerebero/contracts'
import {
  itemEnrichments,
  itemTags,
  items as itemsTable,
  tags as tagsTable,
} from '@cerebero/db/schema'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import type { ItemId, ItemRecord, UserId } from '../items/item-types.js'
import { toItemId, toUserId } from '../items/item-types.js'
import type { TagSummary } from '../tags/tag-types.js'
import { toTagId } from '../tags/tag-types.js'
import type { SearchHit, SearchRepository } from './search-types.js'

type ItemRow = typeof itemsTable.$inferSelect
type ItemEnrichmentRow = typeof itemEnrichments.$inferSelect

function toItemRecord(
  row: ItemRow,
  enrichment: ItemEnrichmentRow | null,
  tags: readonly TagSummary[],
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

export function createDrizzleSearchRepository(
  connection: DatabaseConnection,
): SearchRepository {
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

  return {
    search: async (ownerId, options) => {
      // Weighted document:
      // A authored title (items.search_document)
      // B note (items.search_document) + tag names
      // C extracted title + description
      // D URLs (items.search_document)
      // Trigram similarity provides partial/fuzzy fallback scoring.
      const rankExpression = sql<number>`(
        ts_rank_cd(
          coalesce(${itemsTable.searchDocument}, ''::tsvector)
          || setweight(
            to_tsvector(
              'english',
              coalesce((
                select string_agg(${tagsTable.name}, ' ')
                from ${itemTags}
                inner join ${tagsTable} on ${tagsTable.id} = ${itemTags.tagId}
                where ${itemTags.itemId} = ${itemsTable.id}
                  and ${itemTags.ownerId} = ${ownerId}
                  and ${tagsTable.ownerId} = ${ownerId}
              ), '')
            ),
            'B'
          )
          || setweight(
            to_tsvector('english', coalesce(${itemEnrichments.extractedTitle}, '')),
            'C'
          )
          || setweight(
            to_tsvector('english', coalesce(${itemEnrichments.description}, '')),
            'C'
          ),
          websearch_to_tsquery('english', ${options.query})
        )
        + greatest(
          similarity(coalesce(${itemsTable.authoredTitle}, ''), ${options.query}),
          similarity(coalesce(${itemsTable.normalizedUrl}, ''), ${options.query}),
          similarity(coalesce(${itemEnrichments.extractedTitle}, ''), ${options.query})
        ) * 0.25
      )`

      const matchCondition = sql`(
        coalesce(${itemsTable.searchDocument}, ''::tsvector)
        || setweight(
          to_tsvector(
            'english',
            coalesce((
              select string_agg(${tagsTable.name}, ' ')
              from ${itemTags}
              inner join ${tagsTable} on ${tagsTable.id} = ${itemTags.tagId}
              where ${itemTags.itemId} = ${itemsTable.id}
                and ${itemTags.ownerId} = ${ownerId}
                and ${tagsTable.ownerId} = ${ownerId}
            ), '')
          ),
          'B'
        )
        || setweight(
          to_tsvector('english', coalesce(${itemEnrichments.extractedTitle}, '')),
          'C'
        )
        || setweight(
          to_tsvector('english', coalesce(${itemEnrichments.description}, '')),
          'C'
        )
      ) @@ websearch_to_tsquery('english', ${options.query})
      or coalesce(${itemsTable.authoredTitle}, '') % ${options.query}
      or coalesce(${itemsTable.normalizedUrl}, '') % ${options.query}
      or coalesce(${itemEnrichments.extractedTitle}, '') % ${options.query}
      or coalesce(${itemsTable.noteMarkdown}, '') ilike ${'%' + options.query + '%'}`

      const kindCondition =
        options.kind === 'link'
          ? sql`${itemsTable.originalUrl} is not null`
          : options.kind === 'note'
            ? sql`${itemsTable.originalUrl} is null`
            : undefined

      const pinnedCondition =
        options.pinned === true
          ? sql`${itemsTable.pinnedAt} is not null`
          : options.pinned === false
            ? sql`${itemsTable.pinnedAt} is null`
            : undefined

      const statusCondition = options.status
        ? eq(itemsTable.status, options.status)
        : sql`${itemsTable.status} <> 'trashed'`

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

      const cursorCondition = options.cursor
        ? sql`(
            ${rankExpression} < ${options.cursor.rank}
            or (
              ${rankExpression} = ${options.cursor.rank}
              and (
                ${itemsTable.createdAt} < ${options.cursor.createdAt}
                or (
                  ${itemsTable.createdAt} = ${options.cursor.createdAt}
                  and ${itemsTable.id} < ${options.cursor.id}
                )
              )
            )
          )`
        : undefined

      const rows = await database
        .select({
          enrichment: itemEnrichments,
          item: itemsTable,
          rank: rankExpression,
        })
        .from(itemsTable)
        .leftJoin(itemEnrichments, eq(itemEnrichments.itemId, itemsTable.id))
        .where(
          and(
            eq(itemsTable.ownerId, ownerId),
            statusCondition,
            matchCondition,
            kindCondition,
            pinnedCondition,
            tagCondition,
            cursorCondition,
          ),
        )
        .orderBy(
          sql`${rankExpression} desc`,
          sql`${itemsTable.createdAt} desc`,
          sql`${itemsTable.id} desc`,
        )
        .limit(options.limit)

      const itemIds = rows.map((row) => toItemId(row.item.id))
      const tagsByItemId = await loadTagsByItemIds(ownerId, itemIds)

      const hits: SearchHit[] = rows.map((row) => ({
        rank: Number(row.rank),
        record: toItemRecord(
          row.item,
          row.enrichment,
          tagsByItemId.get(toItemId(row.item.id)) ?? [],
        ),
      }))

      return hits
    },
  }
}
