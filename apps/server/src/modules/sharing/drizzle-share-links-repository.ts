import type { DatabaseConnection } from '@cerebero/db'
import { items as itemsTable, shareLinks } from '@cerebero/db/schema'
import { and, eq, isNull } from 'drizzle-orm'

import { toItemId, toUserId } from '../items/item-types.js'
import type {
  ShareableItemSnapshot,
  ShareLinkRecord,
  ShareLinksRepository,
} from './share-types.js'
import { toShareLinkId } from './share-types.js'

type ShareLinkRow = typeof shareLinks.$inferSelect
type ItemRow = typeof itemsTable.$inferSelect

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}

function toShareLinkRecord(row: ShareLinkRow): ShareLinkRecord {
  return {
    createdAt: row.createdAt,
    id: toShareLinkId(row.id),
    itemId: toItemId(row.itemId),
    ownerId: toUserId(row.ownerId),
    revokedAt: row.revokedAt,
    tokenHash: row.tokenHash,
  }
}

function toShareableItem(item: ItemRow): ShareableItemSnapshot {
  return {
    authoredTitle: item.authoredTitle,
    id: toItemId(item.id),
    noteMarkdown: item.noteMarkdown,
    originalUrl: item.originalUrl,
    ownerId: toUserId(item.ownerId),
    status: item.status,
  }
}

export function createDrizzleShareLinksRepository(
  connection: DatabaseConnection,
): ShareLinksRepository {
  const database = connection.database

  return {
    createActive: async (record) => {
      try {
        const [created] = await database
          .insert(shareLinks)
          .values({
            createdAt: record.createdAt,
            id: record.id,
            itemId: record.itemId,
            ownerId: record.ownerId,
            revokedAt: null,
            tokenHash: record.tokenHash,
          })
          .returning()

        if (!created) {
          throw new Error('The Share Link insert returned no record.')
        }

        return toShareLinkRecord(created)
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new Error('ACTIVE_SHARE_EXISTS', { cause: error })
        }

        throw error
      }
    },

    findActiveByItem: async (ownerId, itemId) => {
      const [row] = await database
        .select()
        .from(shareLinks)
        .where(
          and(
            eq(shareLinks.ownerId, ownerId),
            eq(shareLinks.itemId, itemId),
            isNull(shareLinks.revokedAt),
          ),
        )
        .limit(1)

      return row ? toShareLinkRecord(row) : null
    },

    findActiveByTokenHash: async (tokenHash) => {
      const [row] = await database
        .select()
        .from(shareLinks)
        .where(
          and(
            eq(shareLinks.tokenHash, tokenHash),
            isNull(shareLinks.revokedAt),
          ),
        )
        .limit(1)

      return row ? toShareLinkRecord(row) : null
    },

    findShareableItem: async (ownerId, itemId) => {
      const [row] = await database
        .select()
        .from(itemsTable)
        .where(and(eq(itemsTable.ownerId, ownerId), eq(itemsTable.id, itemId)))
        .limit(1)

      return row ? toShareableItem(row) : null
    },

    findShareableItemById: async (itemId) => {
      const [row] = await database
        .select()
        .from(itemsTable)
        .where(eq(itemsTable.id, itemId))
        .limit(1)

      return row ? toShareableItem(row) : null
    },

    revokeActiveForItem: async (ownerId, itemId, revokedAt) => {
      const revoked = await database
        .update(shareLinks)
        .set({ revokedAt })
        .where(
          and(
            eq(shareLinks.ownerId, ownerId),
            eq(shareLinks.itemId, itemId),
            isNull(shareLinks.revokedAt),
          ),
        )
        .returning({ id: shareLinks.id })

      return revoked.length > 0
    },

    revokeAllActiveForItem: async (itemId, revokedAt) => {
      const revoked = await database
        .update(shareLinks)
        .set({ revokedAt })
        .where(and(eq(shareLinks.itemId, itemId), isNull(shareLinks.revokedAt)))
        .returning({ id: shareLinks.id })

      return revoked.length
    },

    rotateActive: (ownerId, itemId, next, revokedAt) =>
      database.transaction(async (transaction) => {
        const revoked = await transaction
          .update(shareLinks)
          .set({ revokedAt })
          .where(
            and(
              eq(shareLinks.ownerId, ownerId),
              eq(shareLinks.itemId, itemId),
              isNull(shareLinks.revokedAt),
            ),
          )
          .returning({ id: shareLinks.id })

        if (revoked.length === 0) {
          return null
        }

        try {
          const [created] = await transaction
            .insert(shareLinks)
            .values({
              createdAt: next.createdAt,
              id: next.id,
              itemId: next.itemId,
              ownerId: next.ownerId,
              revokedAt: null,
              tokenHash: next.tokenHash,
            })
            .returning()

          if (!created) {
            throw new Error(
              'The Share Link rotation insert returned no record.',
            )
          }

          return toShareLinkRecord(created)
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new Error('ACTIVE_SHARE_EXISTS', { cause: error })
          }

          throw error
        }
      }),
  }
}
