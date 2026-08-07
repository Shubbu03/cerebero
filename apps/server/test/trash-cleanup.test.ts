import { describe, expect, it } from 'vitest'

import { createTrashCleanupModule } from '../src/modules/cleanup/trash-cleanup.js'
import { TRASH_RETENTION_MS } from '../src/modules/cleanup/cleanup-types.js'
import { toItemId, toUserId } from '../src/modules/items/item-types.js'
import type { ItemRecord } from '../src/modules/items/item-types.js'
import { InMemoryTrashCleanupRepository } from './support/in-memory-trash-cleanup-repository.js'

const USER_A = toUserId('user-a')
const USER_B = toUserId('user-b')

function makeTrashedItem(
  id: string,
  ownerId: ReturnType<typeof toUserId>,
  trashedAt: Date,
): ItemRecord {
  return {
    authoredTitle: null,
    createdAt: new Date(trashedAt.getTime() - 1_000),
    enrichment: null,
    id: toItemId(id),
    normalizedUrl: null,
    noteMarkdown: 'note',
    originalUrl: null,
    ownerId,
    pinnedAt: null,
    status: 'trashed',
    tags: [],
    trashedAt,
    updatedAt: trashedAt,
    version: 2,
  }
}

describe('Trash cleanup', () => {
  it('permanently deletes only Trash older than the retention window', async () => {
    const repository = new InMemoryTrashCleanupRepository()
    const now = new Date('2026-09-10T12:00:00.000Z')
    const expiredAt = new Date(now.getTime() - TRASH_RETENTION_MS - 1)
    const retainedAt = new Date(now.getTime() - TRASH_RETENTION_MS + 60_000)

    repository.seed(
      makeTrashedItem(
        '00000000-0000-4000-8000-000000000001',
        USER_A,
        expiredAt,
      ),
    )
    repository.seed(
      makeTrashedItem(
        '00000000-0000-4000-8000-000000000002',
        USER_B,
        expiredAt,
      ),
    )
    repository.seed(
      makeTrashedItem(
        '00000000-0000-4000-8000-000000000003',
        USER_A,
        retainedAt,
      ),
    )
    repository.seed({
      ...makeTrashedItem(
        '00000000-0000-4000-8000-000000000004',
        USER_A,
        expiredAt,
      ),
      status: 'library',
      trashedAt: null,
    })

    const cleanup = createTrashCleanupModule({
      clock: () => now,
      repository,
    })

    const first = await cleanup.purgeExpiredTrash(100)
    expect(first.deletedCount).toBe(2)
    expect(repository.records.size).toBe(2)
    expect(
      repository.records.has('00000000-0000-4000-8000-000000000003'),
    ).toBe(true)
    expect(
      repository.records.has('00000000-0000-4000-8000-000000000004'),
    ).toBe(true)

    const second = await cleanup.purgeExpiredTrash(100)
    expect(second.deletedCount).toBe(0)
  })

  it('purges in bounded batches and is safe to re-run', async () => {
    const repository = new InMemoryTrashCleanupRepository()
    const now = new Date('2026-09-10T12:00:00.000Z')
    const baseExpired = new Date(now.getTime() - TRASH_RETENTION_MS - 60_000)
    const ids = [
      '00000000-0000-4000-8000-000000000011',
      '00000000-0000-4000-8000-000000000012',
      '00000000-0000-4000-8000-000000000013',
      '00000000-0000-4000-8000-000000000014',
      '00000000-0000-4000-8000-000000000015',
    ]

    for (const [index, id] of ids.entries()) {
      repository.seed(
        makeTrashedItem(
          id,
          USER_A,
          new Date(baseExpired.getTime() + index * 1_000),
        ),
      )
    }

    expect(repository.records.size).toBe(5)

    const cleanup = createTrashCleanupModule({
      clock: () => now,
      repository,
    })

    expect(await cleanup.purgeExpiredTrash(2)).toEqual({ deletedCount: 2 })
    expect(await cleanup.purgeExpiredTrash(2)).toEqual({ deletedCount: 2 })
    expect(await cleanup.purgeExpiredTrash(2)).toEqual({ deletedCount: 1 })
    expect(await cleanup.purgeExpiredTrash(2)).toEqual({ deletedCount: 0 })
    expect(repository.records.size).toBe(0)
  })
})
