import 'dotenv/config'

import { closeDatabaseConnection, createDatabase } from '@cerebero/db'

import { parseEnvironment } from '../config.js'
import { createLogger } from '../infrastructure/logging/logger.js'
import { createDrizzleTrashCleanupRepository } from '../modules/cleanup/drizzle-trash-cleanup-repository.js'
import { createTrashCleanupModule } from '../modules/cleanup/trash-cleanup.js'

function parseLimit(value: string | undefined): number {
  if (!value) {
    return 100
  }

  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 500) {
    throw new Error('Limit must be an integer between 1 and 500.')
  }

  return parsed
}

async function main() {
  const environment = parseEnvironment(process.env)
  const logger = createLogger(environment.LOG_LEVEL)

  if (!environment.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to purge expired Trash.')
  }

  const limit = parseLimit(process.env.TRASH_CLEANUP_LIMIT)
  const database = createDatabase(environment.DATABASE_URL)

  try {
    const cleanup = createTrashCleanupModule({
      repository: createDrizzleTrashCleanupRepository(database),
    })
    const result = await cleanup.purgeExpiredTrash(limit)

    logger.info('trash.cleanup.completed', {
      deletedCount: result.deletedCount,
      limit,
    })

    process.stdout.write(
      `${JSON.stringify({ deletedCount: result.deletedCount, limit })}\n`,
    )
  } finally {
    await closeDatabaseConnection(database)
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Trash cleanup failed.'
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
