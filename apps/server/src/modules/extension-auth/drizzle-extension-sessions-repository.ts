import { extensionScopeSchema } from '@cerebero/contracts'
import type { DatabaseConnection } from '@cerebero/db'
import { account, extensionSessions, user } from '@cerebero/db/schema'
import { and, eq, gt, isNull, lt } from 'drizzle-orm'

import { toUserId } from '../items/item-types.js'
import type {
  ActiveExtensionSession,
  ExtensionSessionRecord,
  ExtensionSessionsRepository,
  ExistingGoogleUser,
} from './extension-auth-types.js'
import { toExtensionSessionId } from './extension-auth-types.js'

type ExtensionSessionRow = typeof extensionSessions.$inferSelect
type UserRow = typeof user.$inferSelect

function toPublicUser(row: UserRow) {
  return {
    email: row.email,
    emailVerified: row.emailVerified,
    id: row.id,
    image: row.image,
    name: row.name,
  }
}

function toSessionRecord(row: ExtensionSessionRow): ExtensionSessionRecord {
  return {
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    id: toExtensionSessionId(row.id),
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
    scopes: extensionScopeSchema.array().min(1).parse(row.scopes),
    tokenHash: row.tokenHash,
    userId: toUserId(row.userId),
  }
}

export function createDrizzleExtensionSessionsRepository(
  connection: DatabaseConnection,
): ExtensionSessionsRepository {
  const database = connection.database

  return {
    create: async (record) => {
      const [created] = await database
        .insert(extensionSessions)
        .values({
          createdAt: record.createdAt,
          expiresAt: record.expiresAt,
          id: record.id,
          lastUsedAt: record.lastUsedAt,
          revokedAt: record.revokedAt,
          scopes: record.scopes,
          tokenHash: record.tokenHash,
          userId: record.userId,
        })
        .returning()

      if (!created) {
        throw new Error('The Extension Session insert returned no record.')
      }

      const [owner] = await database
        .select()
        .from(user)
        .where(eq(user.id, created.userId))
        .limit(1)

      if (!owner) {
        throw new Error('The Extension Session owner could not be loaded.')
      }

      return {
        ...toSessionRecord(created),
        user: toPublicUser(owner),
      }
    },

    findActiveByTokenHash: async (tokenHash, now) => {
      const [result] = await database
        .select({ session: extensionSessions, user })
        .from(extensionSessions)
        .innerJoin(user, eq(extensionSessions.userId, user.id))
        .where(
          and(
            eq(extensionSessions.tokenHash, tokenHash),
            isNull(extensionSessions.revokedAt),
            gt(extensionSessions.expiresAt, now),
          ),
        )
        .limit(1)

      if (!result) {
        return null
      }

      const session: ActiveExtensionSession = {
        ...toSessionRecord(result.session),
        user: toPublicUser(result.user),
      }
      return session
    },

    findExistingGoogleUser: async (subject) => {
      const [result] = await database
        .select({ account, user })
        .from(account)
        .innerJoin(user, eq(account.userId, user.id))
        .where(
          and(eq(account.providerId, 'google'), eq(account.accountId, subject)),
        )
        .limit(1)

      if (!result) {
        return null
      }

      const existingUser: ExistingGoogleUser = {
        ...toPublicUser(result.user),
        googleSubject: result.account.accountId,
        id: toUserId(result.user.id),
      }
      return existingUser
    },

    revokeByTokenHash: async (tokenHash, revokedAt) => {
      const revoked = await database
        .update(extensionSessions)
        .set({ revokedAt })
        .where(
          and(
            eq(extensionSessions.tokenHash, tokenHash),
            isNull(extensionSessions.revokedAt),
          ),
        )
        .returning({ id: extensionSessions.id })

      return revoked.length > 0
    },

    touchLastUsed: async (id, lastUsedAt, staleBefore) => {
      await database
        .update(extensionSessions)
        .set({ lastUsedAt })
        .where(
          and(
            eq(extensionSessions.id, id),
            lt(extensionSessions.lastUsedAt, staleBefore),
            isNull(extensionSessions.revokedAt),
          ),
        )
    },
  }
}
