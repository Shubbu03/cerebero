import { describe, expect, it } from 'vitest'

import { getTableConfig } from 'drizzle-orm/pg-core'

import {
  enrichmentJobs,
  enrichmentRetryRateLimits,
  itemEnrichments,
} from '../src/schema/index.js'

describe('Enrichment database schema', () => {
  it('bounds metadata and retry state at the database boundary', () => {
    const enrichment = getTableConfig(itemEnrichments)
    expect(enrichment.foreignKeys).toHaveLength(1)
    expect(enrichment.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        'item_enrichments_attempt_count_nonnegative',
        'item_enrichments_extracted_title_bounded',
        'item_enrichments_description_bounded',
        'item_enrichments_urls_bounded',
        'item_enrichments_error_code_bounded',
      ]),
    )
  })

  it('enforces one lease-safe queue record per Item', () => {
    const jobs = getTableConfig(enrichmentJobs)
    const indexNames = jobs.indexes.map((jobIndex) => jobIndex.config.name)

    expect(jobs.foreignKeys).toHaveLength(1)
    expect(jobs.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        'enrichment_jobs_attempt_count_nonnegative',
        'enrichment_jobs_state_fields_consistent',
      ]),
    )
    expect(indexNames).toEqual(
      expect.arrayContaining([
        'enrichment_jobs_item_id_unique',
        'enrichment_jobs_claim_idx',
        'enrichment_jobs_stale_lease_idx',
      ]),
    )
  })

  it('stores one positive manual-retry quota window per User', () => {
    const rateLimits = getTableConfig(enrichmentRetryRateLimits)

    expect(rateLimits.primaryKeys).toHaveLength(1)
    expect(rateLimits.foreignKeys).toHaveLength(1)
    expect(rateLimits.checks.map((constraint) => constraint.name)).toContain(
      'enrichment_retry_rate_limits_count_positive',
    )
  })
})
