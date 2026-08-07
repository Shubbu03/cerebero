import { describe, expect, it } from 'vitest'

import {
  publicSharedItemSchema,
  shareLinkCreatedSchema,
  shareLinkStatusSchema,
  shareTokenSchema,
} from '../src/index.js'

describe('Sharing contracts', () => {
  it('accepts high-entropy tokens and rejects weak values', () => {
    expect(
      shareTokenSchema.parse('abcdefghijklmnopqrstuvwxyz0123456789_-AB'),
    ).toHaveLength(40)
    expect(shareTokenSchema.safeParse('short').success).toBe(false)
    expect(shareTokenSchema.safeParse('has spaces and!!!').success).toBe(false)
  })

  it('returns plaintext tokens only on create/rotate envelopes', () => {
    expect(
      shareLinkCreatedSchema.parse({
        createdAt: '2026-08-08T10:00:00.000Z',
        itemId: '00000000-0000-4000-8000-000000000001',
        token: 'abcdefghijklmnopqrstuvwxyz0123456789_-AB',
      }),
    ).toMatchObject({
      token: 'abcdefghijklmnopqrstuvwxyz0123456789_-AB',
    })

    expect(
      shareLinkStatusSchema.parse({
        active: true,
        createdAt: '2026-08-08T10:00:00.000Z',
      }),
    ).toEqual({
      active: true,
      createdAt: '2026-08-08T10:00:00.000Z',
    })
    expect(
      shareLinkStatusSchema.safeParse({
        active: true,
        createdAt: '2026-08-08T10:00:00.000Z',
        token: 'secret',
      }).success,
    ).toBe(false)
  })

  it('keeps the public projection deliberately small', () => {
    const publicItem = {
      authoredTitle: 'Title',
      description: null,
      displayTitle: 'Title',
      faviconUrl: null,
      imageUrl: null,
      kind: 'note' as const,
      noteMarkdown: 'Note',
      originalUrl: null,
      siteName: null,
    }
    expect(publicSharedItemSchema.parse(publicItem)).toEqual(publicItem)
    expect(
      publicSharedItemSchema.safeParse({
        ...publicItem,
        ownerId: 'leak',
      }).success,
    ).toBe(false)
    expect(
      publicSharedItemSchema.safeParse({
        ...publicItem,
        tags: [],
      }).success,
    ).toBe(false)
    expect(
      publicSharedItemSchema.safeParse({
        ...publicItem,
        status: 'library',
      }).success,
    ).toBe(false)
  })
})
