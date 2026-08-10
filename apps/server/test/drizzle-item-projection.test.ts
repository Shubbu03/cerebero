import { describe, expect, it } from 'vitest'

import { toItemRecord } from '../src/modules/items/drizzle-item-projection.js'

describe('Drizzle Item projection', () => {
  it('normalizes timestamps returned by raw PostgreSQL projections', () => {
    const record = toItemRecord({
      authoredTitle: 'Projected Item',
      createdAt: '2026-08-09T16:00:00.000Z',
      id: '7af7065f-0b50-4844-8a95-d1c59d3ed32f',
      normalizedUrl: null,
      noteMarkdown: 'A projected note',
      originalUrl: null,
      ownerId: 'user-1',
      pinnedAt: '2026-08-09T16:01:00.000Z',
      status: 'library',
      trashedAt: null,
      updatedAt: '2026-08-09T16:02:00.000Z',
      version: 1,
    })

    expect(record.createdAt).toEqual(new Date('2026-08-09T16:00:00.000Z'))
    expect(record.pinnedAt).toEqual(new Date('2026-08-09T16:01:00.000Z'))
    expect(record.updatedAt).toEqual(new Date('2026-08-09T16:02:00.000Z'))
  })
})
