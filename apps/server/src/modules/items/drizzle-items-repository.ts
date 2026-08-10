import type { DatabaseConnection } from '@cerebero/db'
import { itemTags, items as itemsTable } from '@cerebero/db/schema'
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'

import {
  itemTagsProjection,
  toItemRecord,
  type ProjectedTag,
} from './drizzle-item-projection.js'
import type {
  ItemRecord,
  ItemListOptions,
  ItemRepository,
} from './item-types.js'

type CaptureDatabaseRow = {
  authored_title: string | null
  created_at: Date
  id: string
  normalized_url: string | null
  note_markdown: string | null
  original_url: string | null
  outcome: 'created' | 'duplicate'
  owner_id: string
  pinned_at: Date | null
  status: ItemRecord['status']
  tags: ProjectedTag[]
  trashed_at: Date | null
  updated_at: Date
  version: number
}

function captureRowToItemRecord(row: CaptureDatabaseRow): ItemRecord {
  return toItemRecord(
    {
      authoredTitle: row.authored_title,
      createdAt: row.created_at,
      id: row.id,
      normalizedUrl: row.normalized_url,
      noteMarkdown: row.note_markdown,
      originalUrl: row.original_url,
      ownerId: row.owner_id,
      pinnedAt: row.pinned_at,
      status: row.status,
      trashedAt: row.trashed_at,
      updatedAt: row.updated_at,
      version: row.version,
    },
    row.tags,
  )
}

const titleSortExpression = sql<string>`lower(coalesce(
  nullif(btrim(${itemsTable.authoredTitle}), ''),
  nullif(btrim(${itemsTable.originalUrl}), ''),
  nullif(left(btrim(coalesce(${itemsTable.noteMarkdown}, '')), 300), ''),
  'untitled note'
))`

function listCursorCondition(options: ItemListOptions): SQL | undefined {
  if (!options.cursor) {
    return undefined
  }

  const cursor = options.cursor

  if (options.sort === 'created_desc') {
    if (!cursor.createdAt) {
      return undefined
    }
    return or(
      lt(itemsTable.createdAt, cursor.createdAt),
      and(
        eq(itemsTable.createdAt, cursor.createdAt),
        lt(itemsTable.id, cursor.id),
      ),
    )
  }

  if (options.sort === 'created_asc') {
    if (!cursor.createdAt) {
      return undefined
    }
    return or(
      gt(itemsTable.createdAt, cursor.createdAt),
      and(
        eq(itemsTable.createdAt, cursor.createdAt),
        gt(itemsTable.id, cursor.id),
      ),
    )
  }

  if (options.sort === 'updated_desc') {
    if (!cursor.updatedAt) {
      return undefined
    }
    return or(
      lt(itemsTable.updatedAt, cursor.updatedAt),
      and(
        eq(itemsTable.updatedAt, cursor.updatedAt),
        lt(itemsTable.id, cursor.id),
      ),
    )
  }

  if (cursor.titleKey === undefined) {
    return undefined
  }

  return or(
    sql`${titleSortExpression} > ${cursor.titleKey}`,
    and(
      sql`${titleSortExpression} = ${cursor.titleKey}`,
      gt(itemsTable.id, cursor.id),
    ),
  )
}

function listOrderBy(options: ItemListOptions) {
  switch (options.sort) {
    case 'created_asc':
      return [asc(itemsTable.createdAt), asc(itemsTable.id)] as const
    case 'updated_desc':
      return [desc(itemsTable.updatedAt), desc(itemsTable.id)] as const
    case 'title_asc':
      return [asc(titleSortExpression), asc(itemsTable.id)] as const
    case 'created_desc':
    default:
      return [desc(itemsTable.createdAt), desc(itemsTable.id)] as const
  }
}

export function createDrizzleItemsRepository(
  connection: DatabaseConnection,
): ItemRepository {
  const database = connection.database

  return {
    createCapture: async (record, options) => {
      const rows = (await connection.client`
        with duplicate_items as (
          select
            candidate."id",
            candidate."owner_id",
            candidate."original_url",
            candidate."normalized_url",
            candidate."authored_title",
            candidate."note_markdown",
            candidate."status",
            candidate."pinned_at",
            candidate."trashed_at",
            candidate."version",
            candidate."created_at",
            candidate."updated_at",
            coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'createdAt', tag."created_at",
                    'id', tag."id",
                    'name', tag."name"
                  )
                  order by tag."normalized_name", tag."id"
                )
                from "item_tags" item_tag
                inner join "tags" tag on tag."id" = item_tag."tag_id"
                where item_tag."item_id" = candidate."id"
                  and item_tag."owner_id" = ${record.ownerId}
                  and tag."owner_id" = ${record.ownerId}
              ),
              '[]'::jsonb
            ) as tags
          from "items" candidate
          where ${!options.allowDuplicate}
            and ${record.normalizedUrl}::text is not null
            and candidate."owner_id" = ${record.ownerId}
            and candidate."normalized_url" = ${record.normalizedUrl}
            and candidate."status" <> 'trashed'
          order by candidate."created_at" desc, candidate."id" desc
          limit ${options.duplicateLimit}
        ),
        created_item as (
          insert into "items" (
            "id",
            "owner_id",
            "original_url",
            "normalized_url",
            "authored_title",
            "note_markdown",
            "status",
            "pinned_at",
            "trashed_at",
            "version",
            "created_at",
            "updated_at"
          )
          select
            ${record.id}::uuid,
            ${record.ownerId}::text,
            ${record.originalUrl}::text,
            ${record.normalizedUrl}::text,
            ${record.authoredTitle}::text,
            ${record.noteMarkdown}::text,
            ${record.status}::item_status,
            ${record.pinnedAt?.toISOString() ?? null}::timestamptz,
            ${record.trashedAt?.toISOString() ?? null}::timestamptz,
            ${record.version}::integer,
            ${record.createdAt.toISOString()}::timestamptz,
            ${record.updatedAt.toISOString()}::timestamptz
          where ${options.allowDuplicate}
            or not exists (select 1 from duplicate_items)
          returning
            "id",
            "owner_id",
            "original_url",
            "normalized_url",
            "authored_title",
            "note_markdown",
            "status",
            "pinned_at",
            "trashed_at",
            "version",
            "created_at",
            "updated_at"
        )
        select
          'created'::text as outcome,
          created_item.*,
          '[]'::jsonb as tags
        from created_item
        union all
        select
          'duplicate'::text as outcome,
          duplicate_items."id",
          duplicate_items."owner_id",
          duplicate_items."original_url",
          duplicate_items."normalized_url",
          duplicate_items."authored_title",
          duplicate_items."note_markdown",
          duplicate_items."status",
          duplicate_items."pinned_at",
          duplicate_items."trashed_at",
          duplicate_items."version",
          duplicate_items."created_at",
          duplicate_items."updated_at",
          duplicate_items.tags
        from duplicate_items
        where not exists (select 1 from created_item)
      `) as unknown as CaptureDatabaseRow[]

      const first = rows[0]
      if (!first) {
        throw new Error('The Capture statement returned no result.')
      }

      if (first.outcome === 'duplicate') {
        return {
          outcome: 'duplicate',
          records: rows.map(captureRowToItemRecord),
        }
      }

      return { outcome: 'created', record: captureRowToItemRecord(first) }
    },

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
        .select({ item: itemsTable, tags: itemTagsProjection(ownerId) })
        .from(itemsTable)
        .where(and(eq(itemsTable.ownerId, ownerId), eq(itemsTable.id, itemId)))
        .limit(1)

      if (!record) {
        return null
      }

      return toItemRecord(record.item, record.tags)
    },

    findDuplicates: async (ownerId, normalizedUrl, limit) => {
      const records = await database
        .select({ item: itemsTable, tags: itemTagsProjection(ownerId) })
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

      return records.map((record) => toItemRecord(record.item, record.tags))
    },

    list: async (ownerId, options) => {
      const cursorCondition = listCursorCondition(options)

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

      const orderBy = listOrderBy(options)
      const records = await database
        .select({ item: itemsTable, tags: itemTagsProjection(ownerId) })
        .from(itemsTable)
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
        .orderBy(...orderBy)
        .limit(options.limit)

      return records.map((record) => toItemRecord(record.item, record.tags))
    },

    update: async (ownerId, itemId, expectedVersion, patch) => {
      const records = await database
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
        .returning({ item: itemsTable, tags: itemTagsProjection(ownerId) })

      const updated = records[0]
      if (!updated) {
        return null
      }

      return toItemRecord(updated.item, updated.tags)
    },
  }
}
