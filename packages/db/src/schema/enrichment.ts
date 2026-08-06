import { relations, sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { items } from './items.js'

export const enrichmentStateEnum = pgEnum('enrichment_state', [
  'pending',
  'processing',
  'succeeded',
  'retryable_failed',
  'terminal_failed',
])

export const enrichmentJobStatusEnum = pgEnum('enrichment_job_status', [
  'pending',
  'processing',
  'completed',
  'dead',
])

export const itemEnrichments = pgTable(
  'item_enrichments',
  {
    itemId: uuid('item_id')
      .primaryKey()
      .references(() => items.id, { onDelete: 'cascade' }),
    state: enrichmentStateEnum('state').default('pending').notNull(),
    extractedTitle: text('extracted_title'),
    description: text('description'),
    siteName: text('site_name'),
    canonicalUrl: text('canonical_url'),
    faviconUrl: text('favicon_url'),
    imageUrl: text('image_url'),
    provider: text('provider'),
    attemptCount: integer('attempt_count').default(0).notNull(),
    lastErrorCode: text('last_error_code'),
    nextAttemptAt: timestamp('next_attempt_at', {
      mode: 'date',
      withTimezone: true,
    }),
    enrichedAt: timestamp('enriched_at', {
      mode: 'date',
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'item_enrichments_attempt_count_nonnegative',
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      'item_enrichments_extracted_title_bounded',
      sql`${table.extractedTitle} is null or length(${table.extractedTitle}) <= 500`,
    ),
    check(
      'item_enrichments_description_bounded',
      sql`${table.description} is null or length(${table.description}) <= 2000`,
    ),
    check(
      'item_enrichments_site_name_bounded',
      sql`${table.siteName} is null or length(${table.siteName}) <= 200`,
    ),
    check(
      'item_enrichments_urls_bounded',
      sql`(
        (${table.canonicalUrl} is null or length(${table.canonicalUrl}) <= 2048)
        and (${table.faviconUrl} is null or length(${table.faviconUrl}) <= 2048)
        and (${table.imageUrl} is null or length(${table.imageUrl}) <= 2048)
      )`,
    ),
    check(
      'item_enrichments_provider_bounded',
      sql`${table.provider} is null or length(${table.provider}) <= 100`,
    ),
    check(
      'item_enrichments_error_code_bounded',
      sql`${table.lastErrorCode} is null or length(${table.lastErrorCode}) <= 64`,
    ),
    index('item_enrichments_state_next_attempt_idx').on(
      table.state,
      table.nextAttemptAt,
    ),
  ],
)

export const enrichmentJobs = pgTable(
  'enrichment_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    status: enrichmentJobStatusEnum('status').default('pending').notNull(),
    availableAt: timestamp('available_at', {
      mode: 'date',
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    claimedAt: timestamp('claimed_at', {
      mode: 'date',
      withTimezone: true,
    }),
    leaseToken: uuid('lease_token'),
    leaseExpiresAt: timestamp('lease_expires_at', {
      mode: 'date',
      withTimezone: true,
    }),
    attemptCount: integer('attempt_count').default(0).notNull(),
    lastErrorCode: text('last_error_code'),
    completedAt: timestamp('completed_at', {
      mode: 'date',
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'enrichment_jobs_attempt_count_nonnegative',
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      'enrichment_jobs_error_code_bounded',
      sql`${table.lastErrorCode} is null or length(${table.lastErrorCode}) <= 64`,
    ),
    check(
      'enrichment_jobs_state_fields_consistent',
      sql`(
        (
          ${table.status} = 'pending'
          and ${table.claimedAt} is null
          and ${table.leaseToken} is null
          and ${table.leaseExpiresAt} is null
          and ${table.completedAt} is null
        )
        or
        (
          ${table.status} = 'processing'
          and ${table.claimedAt} is not null
          and ${table.leaseToken} is not null
          and ${table.leaseExpiresAt} is not null
          and ${table.completedAt} is null
        )
        or
        (
          ${table.status} in ('completed', 'dead')
          and ${table.claimedAt} is null
          and ${table.leaseToken} is null
          and ${table.leaseExpiresAt} is null
          and ${table.completedAt} is not null
        )
      )`,
    ),
    uniqueIndex('enrichment_jobs_item_id_unique').on(table.itemId),
    index('enrichment_jobs_claim_idx').on(
      table.status,
      table.availableAt,
      table.createdAt,
      table.id,
    ),
    index('enrichment_jobs_stale_lease_idx')
      .on(table.leaseExpiresAt)
      .where(sql`${table.status} = 'processing'`),
  ],
)

export const itemEnrichmentRelations = relations(
  itemEnrichments,
  ({ one }) => ({
    item: one(items, {
      fields: [itemEnrichments.itemId],
      references: [items.id],
    }),
  }),
)

export const enrichmentJobRelations = relations(enrichmentJobs, ({ one }) => ({
  item: one(items, {
    fields: [enrichmentJobs.itemId],
    references: [items.id],
  }),
}))
