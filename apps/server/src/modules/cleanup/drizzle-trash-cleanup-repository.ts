import type { DatabaseConnection } from '@cerebero/db'
import { items as itemsTable } from '@cerebero/db/schema'
import { and, asc, eq, inArray, isNotNull, lt } from 'drizzle-orm'

import type { TrashCleanupRepository } from './cleanup-types.js'

export function createDrizzleTrashCleanupRepository(
  connection: DatabaseConnection,
): TrashCleanupRepository {
  const database = connection.database

  return {
    deleteExpiredTrash: (cutoff, limit) =>
      database.transaction(async (transaction) => {
        // Bounded, idempotent purge of expired Trash rows. Cascades remove
        // Related tags and Share Links are removed through foreign keys.
        const expired = await transaction
          .select({ id: itemsTable.id })
          .from(itemsTable)
          .where(
            and(
              eq(itemsTable.status, 'trashed'),
              isNotNull(itemsTable.trashedAt),
              lt(itemsTable.trashedAt, cutoff),
            ),
          )
          .orderBy(asc(itemsTable.trashedAt), asc(itemsTable.id))
          .limit(limit)

        if (expired.length === 0) {
          return 0
        }

        const deleted = await transaction
          .delete(itemsTable)
          .where(
            inArray(
              itemsTable.id,
              expired.map((row) => row.id),
            ),
          )
          .returning({ id: itemsTable.id })

        return deleted.length
      }),
  }
}
