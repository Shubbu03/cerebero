import { describe, expect, it } from 'vitest'

import {
  enrichmentRetryResponseSchema,
  enrichmentViewSchema,
} from '../src/index.js'

const EMPTY_METADATA = {
  canonicalUrl: null,
  description: null,
  extractedTitle: null,
  faviconUrl: null,
  imageUrl: null,
  provider: null,
  siteName: null,
}

describe('Enrichment contracts', () => {
  it('accepts each internally consistent public state', () => {
    const states = [
      {
        enrichedAt: null,
        lastErrorCode: null,
        nextAttemptAt: '2026-08-06T12:00:00.000Z',
        state: 'pending',
      },
      {
        enrichedAt: null,
        lastErrorCode: null,
        nextAttemptAt: null,
        state: 'processing',
      },
      {
        enrichedAt: '2026-08-06T12:00:00.000Z',
        lastErrorCode: null,
        nextAttemptAt: null,
        state: 'succeeded',
      },
      {
        enrichedAt: null,
        lastErrorCode: 'timed_out',
        nextAttemptAt: '2026-08-06T12:01:00.000Z',
        state: 'retryable_failed',
      },
      {
        enrichedAt: null,
        lastErrorCode: 'unsupported_content',
        nextAttemptAt: null,
        state: 'terminal_failed',
      },
    ]

    for (const state of states) {
      expect(
        enrichmentViewSchema.safeParse({
          ...EMPTY_METADATA,
          ...state,
          attemptCount: 1,
        }).success,
      ).toBe(true)
    }
  })

  it('rejects inconsistent states, unknown error codes, and unsafe metadata URLs', () => {
    const pending = {
      ...EMPTY_METADATA,
      attemptCount: 0,
      enrichedAt: null,
      lastErrorCode: null,
      nextAttemptAt: '2026-08-06T12:00:00.000Z',
      state: 'pending',
    }

    expect(
      enrichmentViewSchema.safeParse({ ...pending, nextAttemptAt: null })
        .success,
    ).toBe(false)
    expect(
      enrichmentViewSchema.safeParse({
        ...pending,
        lastErrorCode: 'raw-network-error',
      }).success,
    ).toBe(false)
    expect(
      enrichmentViewSchema.safeParse({
        ...pending,
        imageUrl: 'file:///etc/passwd',
      }).success,
    ).toBe(false)
  })

  it('keeps the retry response strict', () => {
    expect(
      enrichmentRetryResponseSchema.safeParse({
        enrichment: {
          ...EMPTY_METADATA,
          attemptCount: 0,
          enrichedAt: null,
          lastErrorCode: null,
          nextAttemptAt: '2026-08-06T12:00:00.000Z',
          state: 'pending',
        },
        ownerId: 'must-not-leak',
      }).success,
    ).toBe(false)
  })
})
