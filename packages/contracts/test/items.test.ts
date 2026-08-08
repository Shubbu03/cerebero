import { describe, expect, it } from 'vitest'

import {
  captureItemInputSchema,
  itemCommandSchema,
  itemPageSchema,
  listItemsQuerySchema,
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

  it('accepts lifecycle commands and requires delete confirmation', () => {
    expect(
      itemCommandSchema.parse({ expectedVersion: 2, type: 'pin' }),
    ).toEqual({ expectedVersion: 2, type: 'pin' })
    expect(
      itemCommandSchema.parse({ expectedVersion: 2, type: 'trash' }),
    ).toEqual({ expectedVersion: 2, type: 'trash' })
    expect(
      itemCommandSchema.parse({
        confirm: true,
        expectedVersion: 3,
        type: 'delete_permanently',
      }),
    ).toEqual({
      confirm: true,
      expectedVersion: 3,
      type: 'delete_permanently',
    })
    expect(
      itemCommandSchema.safeParse({
        expectedVersion: 2,
        type: 'delete_permanently',
      }).success,
    ).toBe(false)
    expect(
      itemCommandSchema.safeParse({
        confirm: true,
        expectedVersion: 2,
        type: 'archive',
      }).success,
    ).toBe(false)
  })

  it('validates the cursor-paginated Item projection', () => {
    expect(itemPageSchema.parse({ items: [], nextCursor: null })).toStrictEqual(
      { items: [], nextCursor: null },
    )
  })

  it('parses Library filter query parameters', () => {
    expect(
      listItemsQuerySchema.parse({
        kind: 'link',
        pinned: 'true',
        status: 'library',
        tag: '00000000-0000-4000-8000-000000000101',
      }),
    ).toEqual({
      kind: 'link',
      limit: 25,
      pinned: true,
      status: 'library',
      tag: ['00000000-0000-4000-8000-000000000101'],
    })
    expect(
      listItemsQuerySchema.parse({
        pinned: 'false',
        tag: [
          '00000000-0000-4000-8000-000000000101',
          '00000000-0000-4000-8000-000000000102',
        ],
      }),
    ).toMatchObject({
      pinned: false,
      tag: [
        '00000000-0000-4000-8000-000000000101',
        '00000000-0000-4000-8000-000000000102',
      ],
    })
    expect(listItemsQuerySchema.safeParse({ pinned: 'yes' }).success).toBe(
      false,
    )
  })
})
