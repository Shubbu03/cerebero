import { describe, expect, it } from 'vitest'

import { createTrashCleanupModule } from '../src/modules/cleanup/trash-cleanup.js'
import { InMemoryTrashCleanupRepository } from './support/in-memory-trash-cleanup-repository.js'

describe('purge-expired-trash entrypoint contract', () => {
  it('exposes a bounded, idempotent purge operation for the runtime script', async () => {
    const repository = new InMemoryTrashCleanupRepository()
    const cleanup = createTrashCleanupModule({
      clock: () => new Date('2026-09-10T12:00:00.000Z'),
      repository,
    })

    await expect(cleanup.purgeExpiredTrash(0)).rejects.toThrow(
      /between 1 and 500/,
    )
    await expect(cleanup.purgeExpiredTrash(501)).rejects.toThrow(
      /between 1 and 500/,
    )

    const first = await cleanup.purgeExpiredTrash(100)
    expect(first).toEqual({ deletedCount: 0 })

    const second = await cleanup.purgeExpiredTrash(100)
    expect(second).toEqual({ deletedCount: 0 })
  })
})
