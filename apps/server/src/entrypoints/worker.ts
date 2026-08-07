import 'dotenv/config'

import { closeDatabaseConnection, createDatabase } from '@cerebero/db'

import { parseEnvironment } from '../config.js'
import { createRestrictedHttpClient } from '../infrastructure/outbound-http/restricted-http-client.js'
import { createLogger } from '../infrastructure/logging/logger.js'
import { createDrizzleTrashCleanupRepository } from '../modules/cleanup/drizzle-trash-cleanup-repository.js'
import { createTrashCleanupModule } from '../modules/cleanup/trash-cleanup.js'
import { createDrizzleEnrichmentQueueRepository } from '../modules/enrichment/drizzle-enrichment-queue-repository.js'
import { createEnrichmentProcessor } from '../modules/enrichment/enrichment-processor.js'
import { createEnrichmentQueue } from '../modules/enrichment/enrichment-queue.js'
import { createEnrichmentWorker } from '../modules/enrichment/enrichment-worker.js'

async function main(): Promise<void> {
  const environment = parseEnvironment(process.env)
  const logger = createLogger(environment.LOG_LEVEL)

  if (!environment.DATABASE_URL) {
    logger.error('enrichment.worker.configuration_invalid', {
      reason: 'database_unavailable',
    })
    process.exitCode = 1
    return
  }

  const database = createDatabase(environment.DATABASE_URL)
  const queue = createEnrichmentQueue({
    repository: createDrizzleEnrichmentQueueRepository(database),
  })
  const processor = createEnrichmentProcessor({
    httpClient: createRestrictedHttpClient(),
    queue,
  })
  const trashCleanup = createTrashCleanupModule({
    repository: createDrizzleTrashCleanupRepository(database),
  })
  const worker = createEnrichmentWorker({
    logger,
    processor,
    queue,
    trashCleanup,
  })
  const controller = new AbortController()

  const stop = (signal: NodeJS.Signals): void => {
    logger.info('enrichment.worker.stop_requested', { signal })
    controller.abort()
  }

  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)

  try {
    await worker.run(controller.signal)
  } catch {
    logger.error('enrichment.worker.crashed')
    process.exitCode = 1
  } finally {
    process.removeListener('SIGINT', stop)
    process.removeListener('SIGTERM', stop)
    await closeDatabaseConnection(database)
  }
}

void main().catch(() => {
  console.error(
    JSON.stringify({
      event: 'enrichment.worker.start_failed',
      level: 'error',
      timestamp: new Date().toISOString(),
    }),
  )
  process.exitCode = 1
})
