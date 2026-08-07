import { relations, sql } from 'drizzle-orm'
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { user } from './auth.js'
import { items } from './items.js'

export const shareLinks = pgTable(
  'share_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp('revoked_at', {
      mode: 'date',
      withTimezone: true,
    }),
  },
  (table) => [
    // At most one active Share Link per Item.
    uniqueIndex('share_links_item_id_active_unique')
      .on(table.itemId)
      .where(sql`${table.revokedAt} is null`),
    uniqueIndex('share_links_token_hash_unique').on(table.tokenHash),
    index('share_links_owner_item_idx').on(table.ownerId, table.itemId),
    index('share_links_owner_created_id_idx').on(
      table.ownerId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
)

export const shareLinkRelations = relations(shareLinks, ({ one }) => ({
  item: one(items, {
    fields: [shareLinks.itemId],
    references: [items.id],
  }),
  owner: one(user, {
    fields: [shareLinks.ownerId],
    references: [user.id],
  }),
}))
