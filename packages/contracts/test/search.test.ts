import { describe, expect, it } from 'vitest'

import { searchQuerySchema, searchResponseSchema } from '../src/index.js'

describe('Search contracts', () => {
  it('requires a bounded query string and parses filters', () => {
    expect(
      searchQuerySchema.parse({
        kind: 'note',
        pinned: 'false',
        q: '  neural  ',
        status: 'library',
        tag: '00000000-0000-4000-8000-000000000101',
      }),
    ).toEqual({
      kind: 'note',
      limit: 25,
      pinned: false,
      q: 'neural',
      status: 'library',
      tag: ['00000000-0000-4000-8000-000000000101'],
    })

    expect(searchQuerySchema.safeParse({ q: '' }).success).toBe(false)
    expect(searchQuerySchema.safeParse({ q: 'x'.repeat(201) }).success).toBe(
      false,
    )
  })

  it('reuses the Item page envelope', () => {
    expect(
      searchResponseSchema.parse({ items: [], nextCursor: null }),
    ).toEqual({ items: [], nextCursor: null })
  })
})
