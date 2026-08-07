export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000

export type TrashCleanupResult = {
  deletedCount: number
}

export interface TrashCleanupRepository {
  deleteExpiredTrash(cutoff: Date, limit: number): Promise<number>
}

export interface TrashCleanupModule {
  purgeExpiredTrash(limit?: number): Promise<TrashCleanupResult>
}
