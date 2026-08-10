import { describe, expect, it } from 'vitest'

import { createSearchModule } from '../src/modules/search/search.js'
import { toItemId, toUserId } from '../src/modules/items/item-types.js'
import type { ItemRecord } from '../src/modules/items/item-types.js'
import { toTagId } from '../src/modules/tags/tag-types.js'
import { InMemorySearchRepository } from './support/in-memory-search-repository.js'

const USER_A = toUserId('user-a')
const USER_B = toUserId('user-b')

function makeItem(
  overrides: Partial<ItemRecord> & Pick<ItemRecord, 'id' | 'ownerId'>,
): ItemRecord {
  const now = new Date('2026-08-07T12:00:00.000Z')
  return {
    authoredTitle: null,
    createdAt: now,
    normalizedUrl: null,
    noteMarkdown: 'body',
    originalUrl: null,
    pinnedAt: null,
    status: 'library',
    tags: [],
    trashedAt: null,
    updatedAt: now,
    version: 1,
    ...overrides,
  }
}

describe('Search module', () => {
  it('finds authored titles and URLs without exposing other Users', async () => {
    const repository = new InMemorySearchRepository()
    repository.seed(
      makeItem({
        authoredTitle: 'Neural notebooks',
        id: toItemId('00000000-0000-4000-8000-000000000001'),
        noteMarkdown: 'personal notes',
        ownerId: USER_A,
      }),
    )
    repository.seed(
      makeItem({
        authoredTitle: null,
        id: toItemId('00000000-0000-4000-8000-000000000002'),
        noteMarkdown: null,
        originalUrl: 'https://example.com/neural',
        normalizedUrl: 'https://example.com/neural',
        ownerId: USER_A,
      }),
    )
    repository.seed(
      makeItem({
        authoredTitle: 'Neural notebooks',
        id: toItemId('00000000-0000-4000-8000-000000000003'),
        ownerId: USER_B,
      }),
    )

    const search = createSearchModule({ repository })
    const page = await search.search(USER_A, {
      limit: 25,
      q: 'Neural',
    })

    expect(page.items.map((item) => item.id)).toEqual([
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    ])
  })

  it('supports filters, tag matching, and pagination without leaking Trash by default', async () => {
    const repository = new InMemorySearchRepository()
    const tagId = toTagId('00000000-0000-4000-8000-000000000201')
    repository.seed(
      makeItem({
        authoredTitle: 'Pinned research',
        createdAt: new Date('2026-08-07T12:00:02.000Z'),
        id: toItemId('00000000-0000-4000-8000-000000000011'),
        ownerId: USER_A,
        pinnedAt: new Date('2026-08-07T12:00:03.000Z'),
        tags: [
          {
            createdAt: new Date('2026-08-07T11:00:00.000Z'),
            id: tagId,
            name: 'Research',
          },
        ],
      }),
    )
    repository.seed(
      makeItem({
        authoredTitle: 'Unpinned research',
        createdAt: new Date('2026-08-07T12:00:01.000Z'),
        id: toItemId('00000000-0000-4000-8000-000000000012'),
        ownerId: USER_A,
      }),
    )
    repository.seed(
      makeItem({
        authoredTitle: 'Trashed research',
        id: toItemId('00000000-0000-4000-8000-000000000013'),
        ownerId: USER_A,
        status: 'trashed',
        trashedAt: new Date('2026-08-07T12:00:00.000Z'),
      }),
    )

    const search = createSearchModule({ repository })
    const filtered = await search.search(USER_A, {
      limit: 25,
      pinned: true,
      q: 'research',
      tag: [tagId],
    })
    expect(filtered.items.map((item) => item.id)).toEqual([
      '00000000-0000-4000-8000-000000000011',
    ])

    const firstPage = await search.search(USER_A, {
      limit: 1,
      q: 'research',
    })
    expect(firstPage.items).toHaveLength(1)
    expect(firstPage.nextCursor).toBeTruthy()

    const secondPage = await search.search(USER_A, {
      cursor: firstPage.nextCursor ?? undefined,
      limit: 1,
      q: 'research',
    })
    expect(secondPage.items).toHaveLength(1)
    expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id)
    expect(secondPage.items.every((item) => item.status !== 'trashed')).toBe(
      true,
    )
  })

  it('finds partial title words and partial tag names', async () => {
    const repository = new InMemorySearchRepository()
    repository.seed(
      makeItem({
        authoredTitle: 'Naruto Shippuden arcs',
        id: toItemId('00000000-0000-4000-8000-000000000021'),
        ownerId: USER_A,
        tags: [
          {
            createdAt: new Date('2026-08-07T11:00:00.000Z'),
            id: toTagId('00000000-0000-4000-8000-000000000221'),
            name: 'demo1',
          },
        ],
      }),
    )

    const search = createSearchModule({ repository })

    await expect(
      search.search(USER_A, { limit: 25, q: 'shippu' }),
    ).resolves.toMatchObject({
      items: [{ displayTitle: 'Naruto Shippuden arcs' }],
    })
    await expect(
      search.search(USER_A, { limit: 25, q: 'demo' }),
    ).resolves.toMatchObject({
      items: [{ displayTitle: 'Naruto Shippuden arcs' }],
    })
  })

  it('restricts tag-scoped search to partial tag-name matches', async () => {
    const repository = new InMemorySearchRepository()
    repository.seed(
      makeItem({
        authoredTitle: 'Git workflows without a matching tag',
        id: toItemId('00000000-0000-4000-8000-000000000031'),
        ownerId: USER_A,
      }),
    )
    repository.seed(
      makeItem({
        authoredTitle: 'Version control notes',
        id: toItemId('00000000-0000-4000-8000-000000000032'),
        ownerId: USER_A,
        tags: [
          {
            createdAt: new Date('2026-08-07T11:00:00.000Z'),
            id: toTagId('00000000-0000-4000-8000-000000000231'),
            name: 'github',
          },
        ],
      }),
    )

    const search = createSearchModule({ repository })
    const page = await search.search(USER_A, {
      limit: 25,
      q: 'git',
      scope: 'tags',
    })

    expect(page.items.map((item) => item.id)).toEqual([
      '00000000-0000-4000-8000-000000000032',
    ])
  })

  it('rejects empty and invalid cursors', async () => {
    const search = createSearchModule({
      repository: new InMemorySearchRepository(),
    })

    await expect(
      search.search(USER_A, { limit: 25, q: '   ' }),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    await expect(
      search.search(USER_A, {
        cursor: 'not-valid',
        limit: 25,
        q: 'ok',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
  })
})
