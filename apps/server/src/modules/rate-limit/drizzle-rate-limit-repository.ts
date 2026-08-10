import { randomUUID } from 'node:crypto'

import type { DatabaseConnection } from '@cerebero/db'
import { rateLimit } from '@cerebero/db/schema'
import { sql } from 'drizzle-orm'

import type { RateLimitRepository } from './rate-limit-types.js'

export function createDrizzleRateLimitRepository(
  connection: DatabaseConnection,
): RateLimitRepository {
  return {
    async increment({ key, now, resetBefore }) {
      const [record] = await connection.database
        .insert(rateLimit)
        .values({
          count: 1,
          id: randomUUID(),
          key,
          lastRequest: now,
        })
        .onConflictDoUpdate({
          set: {
            count: sql<number>`case when ${rateLimit.lastRequest} < ${resetBefore} then 1 else ${rateLimit.count} + 1 end`,
            lastRequest: sql<number>`case when ${rateLimit.lastRequest} < ${resetBefore} then ${now} else ${rateLimit.lastRequest} end`,
          },
          target: rateLimit.key,
        })
        .returning({
          count: rateLimit.count,
          windowStartedAt: rateLimit.lastRequest,
        })

      if (!record) {
        throw new Error('The rate-limit counter could not be updated.')
      }

      return record
    },
  }
}
