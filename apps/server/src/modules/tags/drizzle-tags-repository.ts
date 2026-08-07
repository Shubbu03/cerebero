import type { DatabaseConnection } from '@cerebero/db'
import { itemTags, items as itemsTable, tags as tagsTable } from '@cerebero/db/schema'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import type { ItemId } from '../items/item-types.js'
import { toItemId, toUserId } from '../items/item-types.js'
import type { TagRecord, TagRepository, TagSummary } from './tag-types.js'
import { toTagId } from './tag-types.js'

type TagRow = typeof tagsTable.$inferSelect

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}

function toTagRecord(row: TagRow): TagRecord {
  return {
    createdAt: row.createdAt,
    id: toTagId(row.id),
    name: row.name,
    normalizedName: row.normalizedName,
    ownerId: toUserId(row.ownerId),
  }
}

function toTagSummary(row: {
  createdAt: Date
  id: string
  name: string
}): TagSummary {
  return {
    createdAt: row.createdAt,
    id: toTagId(row.id),
    name: row.name,
  }
}

export function createDrizzleTagsRepository(
  connection: DatabaseConnection,
): TagRepository {
  const database = connection.database

  return {
    attach: async (ownerId, itemId, tagId, createdAt) => {
      const [item] = await database
        .select({ id: itemsTable.id })
        .from(itemsTable)
        .where(and(eq(itemsTable.ownerId, ownerId), eq(itemsTable.id, itemId)))
        .limit(1)
      const [tag] = await database
        .select({ id: tagsTable.id })
        .from(tagsTable)
        .where(and(eq(tagsTable.ownerId, ownerId), eq(tagsTable.id, tagId)))
        .limit(1)

      if (!item || !tag) {
        return null
      }

      try {
        await database.insert(itemTags).values({
          createdAt,
          itemId,
          ownerId,
          tagId,
        })
        return 'attached'
      } catch (error) {
        if (isUniqueViolation(error)) {
          return 'already_attached'
        }

        throw error
      }
    },

    countItemTags: async (ownerId, itemId) => {
      const [result] = await database
        .select({ count: sql<number>`count(*)::int` })
        .from(itemTags)
        .where(and(eq(itemTags.ownerId, ownerId), eq(itemTags.itemId, itemId)))

      return result?.count ?? 0
    },

    create: async (record) => {
      try {
        const [created] = await database
          .insert(tagsTable)
          .values({
            createdAt: record.createdAt,
            id: record.id,
            name: record.name,
            normalizedName: record.normalizedName,
            ownerId: record.ownerId,
          })
          .returning()

        if (!created) {
          throw new Error('The Tag insert returned no record.')
        }

        return toTagRecord(created)
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new Error('DUPLICATE_TAG', { cause: error })
        }

        throw error
      }
    },

    delete: async (ownerId, tagId) => {
      const deleted = await database
        .delete(tagsTable)
        .where(and(eq(tagsTable.ownerId, ownerId), eq(tagsTable.id, tagId)))
        .returning({ id: tagsTable.id })

      return deleted.length > 0
    },

    detach: async (ownerId, itemId, tagId) => {
      const deleted = await database
        .delete(itemTags)
        .where(
          and(
            eq(itemTags.ownerId, ownerId),
            eq(itemTags.itemId, itemId),
            eq(itemTags.tagId, tagId),
          ),
        )
        .returning({ itemId: itemTags.itemId })

      return deleted.length > 0
    },

    findById: async (ownerId, tagId) => {
      const [row] = await database
        .select()
        .from(tagsTable)
        .where(and(eq(tagsTable.ownerId, ownerId), eq(tagsTable.id, tagId)))
        .limit(1)

      return row ? toTagRecord(row) : null
    },

    findByNormalizedName: async (ownerId, normalizedName) => {
      const [row] = await database
        .select()
        .from(tagsTable)
        .where(
          and(
            eq(tagsTable.ownerId, ownerId),
            eq(tagsTable.normalizedName, normalizedName),
          ),
        )
        .limit(1)

      return row ? toTagRecord(row) : null
    },

    findItemRef: async (ownerId, itemId) => {
      const [row] = await database
        .select({ id: itemsTable.id, ownerId: itemsTable.ownerId })
        .from(itemsTable)
        .where(and(eq(itemsTable.ownerId, ownerId), eq(itemsTable.id, itemId)))
        .limit(1)

      return row
        ? { id: row.id, ownerId: toUserId(row.ownerId) }
        : null
    },

    list: async (ownerId) => {
      const rows = await database
        .select()
        .from(tagsTable)
        .where(eq(tagsTable.ownerId, ownerId))
        .orderBy(asc(tagsTable.normalizedName), asc(tagsTable.id))

      return rows.map(toTagRecord)
    },

    listForItem: async (ownerId, itemId) => {
      const rows = await database
        .select({
          createdAt: tagsTable.createdAt,
          id: tagsTable.id,
          name: tagsTable.name,
        })
        .from(itemTags)
        .innerJoin(tagsTable, eq(tagsTable.id, itemTags.tagId))
        .where(
          and(
            eq(itemTags.ownerId, ownerId),
            eq(itemTags.itemId, itemId),
            eq(tagsTable.ownerId, ownerId),
          ),
        )
        .orderBy(asc(tagsTable.normalizedName), asc(tagsTable.id))

      return rows.map(toTagSummary)
    },

    listForItems: async (ownerId, itemIds) => {
      const result = new Map<ItemId, TagSummary[]>()
      for (const itemId of itemIds) {
        result.set(itemId, [])
      }

      if (itemIds.length === 0) {
        return result
      }

      const rows = await database
        .select({
          createdAt: tagsTable.createdAt,
          id: tagsTable.id,
          itemId: itemTags.itemId,
          name: tagsTable.name,
        })
        .from(itemTags)
        .innerJoin(tagsTable, eq(tagsTable.id, itemTags.tagId))
        .where(
          and(
            eq(itemTags.ownerId, ownerId),
            inArray(itemTags.itemId, [...itemIds]),
            eq(tagsTable.ownerId, ownerId),
          ),
        )
        .orderBy(asc(tagsTable.normalizedName), asc(tagsTable.id))

      for (const row of rows) {
        const itemId = toItemId(row.itemId)
        const current = result.get(itemId) ?? []
        current.push(toTagSummary(row))
        result.set(itemId, current)
      }

      return result
    },

    rename: async (ownerId, tagId, name, normalizedName) => {
      try {
        const [updated] = await database
          .update(tagsTable)
          .set({ name, normalizedName })
          .where(and(eq(tagsTable.ownerId, ownerId), eq(tagsTable.id, tagId)))
          .returning()

        return updated ? toTagRecord(updated) : null
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new Error('DUPLICATE_TAG', { cause: error })
        }

        throw error
      }
    },
  }
}
