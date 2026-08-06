import { describe, expect, it } from 'vitest'

import {
  captureItemInputSchema,
  itemCommandSchema,
  itemPageSchema,
  updateItemInputSchema,
} from '../src/index.js'

describe('Item contracts', () => {
  it('accepts URL-only, note-only, and combined Captures', () => {
    expect(
      captureItemInputSchema.parse({ originalUrl: 'https://example.com/path' }),
    ).toMatchObject({ allowDuplicate: false })
    expect(
      captureItemInputSchema.parse({ noteMarkdown: '# A private note' }),
    ).toMatchObject({ noteMarkdown: '# A private note' })
    expect(
      captureItemInputSchema.parse({
        noteMarkdown: 'Context',
        originalUrl: 'https://example.com',
      }),
    ).toMatchObject({ noteMarkdown: 'Context' })
  })

  it('rejects empty captures, unknown fields, and empty edits', () => {
    expect(
      captureItemInputSchema.safeParse({ noteMarkdown: '   ' }).success,
    ).toBe(false)
    expect(
      captureItemInputSchema.safeParse({
        noteMarkdown: 'valid',
        ownerId: 'attacker-selected',
      }).success,
    ).toBe(false)
    expect(
      updateItemInputSchema.safeParse({ expectedVersion: 1 }).success,
    ).toBe(false)
  })

  it('keeps commands bounded to the Phase 2 lifecycle surface', () => {
    expect(
      itemCommandSchema.parse({ expectedVersion: 2, type: 'file' }),
    ).toEqual({ expectedVersion: 2, type: 'file' })
    expect(
      itemCommandSchema.safeParse({ expectedVersion: 2, type: 'trash' })
        .success,
    ).toBe(false)
  })

  it('validates the cursor-paginated Item projection', () => {
    expect(itemPageSchema.parse({ items: [], nextCursor: null })).toStrictEqual(
      { items: [], nextCursor: null },
    )
  })
})
