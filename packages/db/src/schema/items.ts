import { relations, sql } from 'drizzle-orm'
import {
  check,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { user } from './auth.js'

export const itemStatusEnum = pgEnum('item_status', [
  'library',
  'archived',
  'trashed',
])

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const items = pgTable(
  'items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    originalUrl: text('original_url'),
    normalizedUrl: text('normalized_url'),
    authoredTitle: text('authored_title'),
    noteMarkdown: text('note_markdown'),
    status: itemStatusEnum('status').default('library').notNull(),
    pinnedAt: timestamp('pinned_at', { mode: 'date', withTimezone: true }),
    trashedAt: timestamp('trashed_at', { mode: 'date', withTimezone: true }),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    // Weighted core document for FTS: A=authored title, B=note, D=URLs.
    // Extracted metadata and tag names are merged at query time.
    searchDocument: tsvector('search_document').generatedAlwaysAs(
      sql`
        setweight(to_tsvector('english', coalesce(${sql.raw('"authored_title"')}, '')), 'A')
        || setweight(to_tsvector('english', coalesce(${sql.raw('"note_markdown"')}, '')), 'B')
        || setweight(to_tsvector('english', coalesce(${sql.raw('"original_url"')}, '')), 'D')
        || setweight(to_tsvector('english', coalesce(${sql.raw('"normalized_url"')}, '')), 'D')
      `,
    ),
  },
  (table) => [
    check(
      'items_content_required',
      sql`(
        (${table.originalUrl} is not null and length(btrim(${table.originalUrl})) > 0)
        or
        (${table.noteMarkdown} is not null and length(btrim(${table.noteMarkdown})) > 0)
      )`,
    ),
    check(
      'items_pin_requires_active_status',
      sql`${table.pinnedAt} is null or ${table.status} = 'library'`,
    ),
    check(
      'items_trashed_at_matches_status',
      sql`(
        (${table.status} = 'trashed' and ${table.trashedAt} is not null)
        or
        (${table.status} <> 'trashed' and ${table.trashedAt} is null)
      )`,
    ),
    check('items_version_positive', sql`${table.version} > 0`),
    index('items_owner_status_created_id_idx').on(
      table.ownerId,
      table.status,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index('items_owner_active_normalized_url_idx')
      .on(table.ownerId, table.normalizedUrl)
      .where(
        sql`${table.normalizedUrl} is not null and ${table.status} <> 'trashed'`,
      ),
    index('items_trashed_at_idx')
      .on(table.trashedAt, table.id)
      .where(
        sql`${table.status} = 'trashed' and ${table.trashedAt} is not null`,
      ),
    index('items_owner_status_pinned_created_id_idx')
      .on(
        table.ownerId,
        table.status,
        table.pinnedAt.desc(),
        table.createdAt.desc(),
        table.id.desc(),
      )
      .where(sql`${table.pinnedAt} is not null`),
    index('items_search_document_gin_idx').using('gin', table.searchDocument),
    index('items_authored_title_trgm_idx').using(
      'gin',
      sql`coalesce(${table.authoredTitle}, '') gin_trgm_ops`,
    ),
    index('items_normalized_url_trgm_idx').using(
      'gin',
      sql`coalesce(${table.normalizedUrl}, '') gin_trgm_ops`,
    ),
  ],
)

export const itemRelations = relations(items, ({ one }) => ({
  owner: one(user, {
    fields: [items.ownerId],
    references: [user.id],
  }),
}))
