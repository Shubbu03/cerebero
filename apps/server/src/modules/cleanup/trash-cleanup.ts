import {
  TRASH_RETENTION_MS,
  type TrashCleanupModule,
  type TrashCleanupRepository,
} from './cleanup-types.js'

const DEFAULT_BATCH_SIZE = 100
const MAX_BATCH_SIZE = 500

type TrashCleanupOptions = {
  clock?: () => Date
  repository: TrashCleanupRepository
  retentionMs?: number
}

export function createTrashCleanupModule(
  options: TrashCleanupOptions,
): TrashCleanupModule {
  const clock = options.clock ?? (() => new Date())
  const retentionMs = options.retentionMs ?? TRASH_RETENTION_MS

  return {
    purgeExpiredTrash: async (limit = DEFAULT_BATCH_SIZE) => {
      if (
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > MAX_BATCH_SIZE
      ) {
        throw new Error(
          `Trash cleanup limit must be between 1 and ${MAX_BATCH_SIZE}.`,
        )
      }

      const cutoff = new Date(clock().getTime() - retentionMs)
      const deletedCount = await options.repository.deleteExpiredTrash(
        cutoff,
        limit,
      )
      return { deletedCount }
    },
  }
}
