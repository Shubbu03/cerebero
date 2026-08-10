import { itemTags, tags as tagsTable } from '@cerebero/db/schema'
import type { items as itemsTable } from '@cerebero/db/schema'
import { sql } from 'drizzle-orm'

import type { TagSummary } from '../tags/tag-types.js'
import { toTagId } from '../tags/tag-types.js'
import type { ItemRecord, UserId } from './item-types.js'
import { toItemId, toUserId } from './item-types.js'

type ItemRow = typeof itemsTable.$inferSelect
type ItemProjectionRow = Pick<
  ItemRow,
  | 'authoredTitle'
  | 'id'
  | 'normalizedUrl'
  | 'noteMarkdown'
  | 'originalUrl'
  | 'ownerId'
  | 'status'
  | 'version'
> & {
  createdAt: Date | string
  pinnedAt: Date | string | null
  trashedAt: Date | string | null
  updatedAt: Date | string
}

export type ProjectedTag = {
  createdAt: Date | string
  id: string
  name: string
}

export function itemTagsProjection(ownerId: UserId) {
  return sql<ProjectedTag[]>`coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'createdAt', ${sql.raw('"tags"."created_at"')},
          'id', ${sql.raw('"tags"."id"')},
          'name', ${sql.raw('"tags"."name"')}
        )
        order by ${sql.raw('"tags"."normalized_name"')}, ${sql.raw('"tags"."id"')}
      )
      from ${itemTags}
      inner join ${tagsTable}
        on ${sql.raw('"tags"."id"')} = ${sql.raw('"item_tags"."tag_id"')}
      where ${sql.raw('"item_tags"."item_id"')} = ${sql.raw('"items"."id"')}
        and ${sql.raw('"item_tags"."owner_id"')} = ${ownerId}
        and ${sql.raw('"tags"."owner_id"')} = ${ownerId}
    ),
    '[]'::jsonb
  )`
}

function toTagSummary(tag: ProjectedTag): TagSummary {
  return {
    createdAt:
      tag.createdAt instanceof Date ? tag.createdAt : new Date(tag.createdAt),
    id: toTagId(tag.id),
    name: tag.name,
  }
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

function toNullableDate(value: Date | string | null): Date | null {
  return value === null ? null : toDate(value)
}

export function toItemRecord(
  row: ItemProjectionRow,
  projectedTags: readonly ProjectedTag[] = [],
): ItemRecord {
  return {
    authoredTitle: row.authoredTitle,
    createdAt: toDate(row.createdAt),
    id: toItemId(row.id),
    normalizedUrl: row.normalizedUrl,
    noteMarkdown: row.noteMarkdown,
    originalUrl: row.originalUrl,
    ownerId: toUserId(row.ownerId),
    pinnedAt: toNullableDate(row.pinnedAt),
    status: row.status,
    tags: projectedTags.map(toTagSummary),
    trashedAt: toNullableDate(row.trashedAt),
    updatedAt: toDate(row.updatedAt),
    version: row.version,
  }
}
