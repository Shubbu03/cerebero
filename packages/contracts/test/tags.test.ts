import { describe, expect, it } from 'vitest'

import {
  createTagInputSchema,
  itemViewSchema,
  renameTagInputSchema,
  tagListSchema,
  tagViewSchema,
} from '../src/index.js'

const TAG = {
  createdAt: '2026-08-07T12:00:00.000Z',
  id: '00000000-0000-4000-8000-000000000101',
  name: 'Research',
}

describe('Tag contracts', () => {
  it('accepts trimmed Tag names and rejects empty or oversized values', () => {
    expect(createTagInputSchema.parse({ name: '  Research  ' })).toEqual({
      name: 'Research',
    })
    expect(createTagInputSchema.safeParse({ name: '   ' }).success).toBe(false)
    expect(
      createTagInputSchema.safeParse({ name: 'x'.repeat(65) }).success,
    ).toBe(false)
    expect(
      createTagInputSchema.safeParse({
        name: 'Research',
        ownerId: 'attacker',
      }).success,
    ).toBe(false)
  })

  it('validates rename payloads strictly', () => {
    expect(renameTagInputSchema.parse({ name: 'Later' })).toEqual({
      name: 'Later',
    })
    expect(renameTagInputSchema.safeParse({}).success).toBe(false)
  })

  it('validates Tag projections and list envelopes', () => {
    expect(tagViewSchema.parse(TAG)).toEqual(TAG)
    expect(tagListSchema.parse({ tags: [TAG] })).toEqual({ tags: [TAG] })
    expect(
      tagViewSchema.safeParse({
        ...TAG,
        ownerId: 'hidden',
      }).success,
    ).toBe(false)
  })

  it('requires tags on Item projections', () => {
    const item = {
      authoredTitle: null,
      createdAt: '2026-08-06T09:00:00.000Z',
      displayTitle: 'Note',
      enrichment: null,
      id: '00000000-0000-4000-8000-000000000001',
      kind: 'note' as const,
      noteMarkdown: 'Body',
      originalUrl: null,
      pinnedAt: null,
      status: 'inbox' as const,
      tags: [TAG],
      updatedAt: '2026-08-06T09:00:00.000Z',
      version: 1,
    }

    expect(itemViewSchema.parse(item)).toEqual(item)
    const withoutTags = {
      authoredTitle: item.authoredTitle,
      createdAt: item.createdAt,
      displayTitle: item.displayTitle,
      enrichment: item.enrichment,
      id: item.id,
      kind: item.kind,
      noteMarkdown: item.noteMarkdown,
      originalUrl: item.originalUrl,
      pinnedAt: item.pinnedAt,
      status: item.status,
      updatedAt: item.updatedAt,
      version: item.version,
    }
    expect(itemViewSchema.safeParse(withoutTags).success).toBe(false)
  })
})
