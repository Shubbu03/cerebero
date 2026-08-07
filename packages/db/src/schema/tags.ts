import { relations, sql } from 'drizzle-orm'
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { user } from './auth.js'
import { items } from './items.js'

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'tags_name_nonempty',
      sql`length(btrim(${table.name})) > 0 and length(${table.name}) <= 64`,
    ),
    check(
      'tags_normalized_name_matches',
      sql`${table.normalizedName} = lower(btrim(${table.name}))`,
    ),
    uniqueIndex('tags_owner_normalized_name_unique').on(
      table.ownerId,
      table.normalizedName,
    ),
    index('tags_owner_created_id_idx').on(
      table.ownerId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
)

export const itemTags = pgTable(
  'item_tags',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.tagId] }),
    index('item_tags_owner_tag_item_idx').on(
      table.ownerId,
      table.tagId,
      table.itemId,
    ),
    index('item_tags_owner_item_tag_idx').on(
      table.ownerId,
      table.itemId,
      table.tagId,
    ),
  ],
)

export const tagRelations = relations(tags, ({ one, many }) => ({
  owner: one(user, {
    fields: [tags.ownerId],
    references: [user.id],
  }),
  itemTags: many(itemTags),
}))

export const itemTagRelations = relations(itemTags, ({ one }) => ({
  item: one(items, {
    fields: [itemTags.itemId],
    references: [items.id],
  }),
  owner: one(user, {
    fields: [itemTags.ownerId],
    references: [user.id],
  }),
  tag: one(tags, {
    fields: [itemTags.tagId],
    references: [tags.id],
  }),
}))
