import { relations, sql } from 'drizzle-orm'
import {
  check,
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  pgTable,
} from 'drizzle-orm/pg-core'

import { user } from './auth.js'

export const extensionSessions = pgTable(
  'extension_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    scopes: text('scopes').array().notNull(),
    expiresAt: timestamp('expires_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    revokedAt: timestamp('revoked_at', { mode: 'date', withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'extension_sessions_token_hash_length',
      sql`length(${table.tokenHash}) = 64`,
    ),
    check(
      'extension_sessions_scope_required',
      sql`cardinality(${table.scopes}) > 0`,
    ),
    uniqueIndex('extension_sessions_token_hash_idx').on(table.tokenHash),
    index('extension_sessions_user_created_idx').on(
      table.userId,
      table.createdAt.desc(),
    ),
    index('extension_sessions_expiry_idx')
      .on(table.expiresAt)
      .where(sql`${table.revokedAt} is null`),
  ],
)

export const extensionSessionRelations = relations(
  extensionSessions,
  ({ one }) => ({
    user: one(user, {
      fields: [extensionSessions.userId],
      references: [user.id],
    }),
  }),
)
