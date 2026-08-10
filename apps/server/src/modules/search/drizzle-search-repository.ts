import type { DatabaseConnection } from '@cerebero/db'
import {
  itemTags,
  items as itemsTable,
  tags as tagsTable,
} from '@cerebero/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'

import {
  itemTagsProjection,
  toItemRecord,
} from '../items/drizzle-item-projection.js'
import type {
  SearchHit,
  SearchRepository,
  SearchRepositoryOptions,
} from './search-types.js'

function toContainsPattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, '\\$&')}%`
}

export function createSearchExpressions(
  ownerId: string,
  query: string,
  scope: SearchRepositoryOptions['scope'] = 'all',
) {
  const containsPattern = toContainsPattern(query)
  const tagMatchExpression = sql`exists (
    select 1
    from ${itemTags}
    inner join ${tagsTable}
      on ${sql.raw('"tags"."id"')} = ${sql.raw('"item_tags"."tag_id"')}
    where ${sql.raw('"item_tags"."item_id"')} = ${sql.raw('"items"."id"')}
      and ${sql.raw('"item_tags"."owner_id"')} = ${ownerId}
      and ${sql.raw('"tags"."owner_id"')} = ${ownerId}
      and ${sql.raw('"tags"."name"')} ilike ${containsPattern}
  )`

  if (scope === 'tags') {
    return {
      matchExpression: tagMatchExpression,
      rankExpression: sql<number>`coalesce((
        select max(similarity(${sql.raw('"tags"."name"')}, ${query}))
        from ${itemTags}
        inner join ${tagsTable}
          on ${sql.raw('"tags"."id"')} = ${sql.raw('"item_tags"."tag_id"')}
        where ${sql.raw('"item_tags"."item_id"')} = ${sql.raw('"items"."id"')}
          and ${sql.raw('"item_tags"."owner_id"')} = ${ownerId}
          and ${sql.raw('"tags"."owner_id"')} = ${ownerId}
          and ${sql.raw('"tags"."name"')} ilike ${containsPattern}
      ), 0)`,
    }
  }

  const documentExpression = sql`(
    coalesce(${sql.raw('"items"."search_document"')}, ''::tsvector)
    || setweight(
      to_tsvector(
        'english',
        coalesce((
          select string_agg(${sql.raw('"tags"."name"')}, ' ')
          from ${itemTags}
          inner join ${tagsTable}
            on ${sql.raw('"tags"."id"')} = ${sql.raw('"item_tags"."tag_id"')}
          where ${sql.raw('"item_tags"."item_id"')} = ${sql.raw('"items"."id"')}
            and ${sql.raw('"item_tags"."owner_id"')} = ${ownerId}
            and ${sql.raw('"tags"."owner_id"')} = ${ownerId}
        ), '')
      ),
      'B'
    )
  )`
  const prefixQueryExpression = sql`to_tsquery(
    'english',
    coalesce((
      select string_agg(quote_literal(search_lexeme) || ':*', ' & ')
      from unnest(
        tsvector_to_array(to_tsvector('english', ${query}))
      ) as search_lexeme
    ), '')
  )`

  return {
    matchExpression: sql`(
      ${documentExpression} @@ ${prefixQueryExpression}
      or coalesce(${sql.raw('"items"."authored_title"')}, '') ilike ${containsPattern}
      or coalesce(${sql.raw('"items"."authored_title"')}, '') % ${query}
      or coalesce(${sql.raw('"items"."original_url"')}, '') ilike ${containsPattern}
      or coalesce(${sql.raw('"items"."normalized_url"')}, '') ilike ${containsPattern}
      or coalesce(${sql.raw('"items"."normalized_url"')}, '') % ${query}
      or coalesce(${sql.raw('"items"."note_markdown"')}, '') ilike ${containsPattern}
      or ${tagMatchExpression}
    )`,
    rankExpression: sql<number>`(
      ts_rank_cd(
        ${documentExpression},
        ${prefixQueryExpression}
      )
      + greatest(
        similarity(coalesce(${sql.raw('"items"."authored_title"')}, ''), ${query}),
        similarity(coalesce(${sql.raw('"items"."normalized_url"')}, ''), ${query})
      ) * 0.25
    )`,
  }
}

export function createDrizzleSearchRepository(
  connection: DatabaseConnection,
): SearchRepository {
  const database = connection.database

  return {
    search: async (ownerId, options) => {
      const { matchExpression, rankExpression } = createSearchExpressions(
        ownerId,
        options.query,
        options.scope,
      )

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
          item: itemsTable,
          rank: rankExpression,
          tags: itemTagsProjection(ownerId),
        })
        .from(itemsTable)
        .where(
          and(
            eq(itemsTable.ownerId, ownerId),
            statusCondition,
            matchExpression,
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

      const hits: SearchHit[] = rows.map((row) => ({
        rank: Number(row.rank),
        record: toItemRecord(row.item, row.tags),
      }))

      return hits
    },
  }
}
