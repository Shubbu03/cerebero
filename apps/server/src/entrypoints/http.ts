import 'dotenv/config'

import { serve } from '@hono/node-server'
import {
  checkDatabaseConnection,
  closeDatabaseConnection,
  createDatabase,
} from '@cerebero/db'

import { parseEnvironment } from '../config.js'
import { createApp } from '../http/app.js'
import { createLogger } from '../infrastructure/logging/logger.js'
import { createDrizzleEnrichmentRetryRepository } from '../modules/enrichment/drizzle-enrichment-retry-repository.js'
import { createEnrichmentRetryModule } from '../modules/enrichment/enrichment-retry.js'
import { createDrizzleItemsRepository } from '../modules/items/drizzle-items-repository.js'
import { createItemsModule } from '../modules/items/items.js'

const environment = parseEnvironment(process.env)
const logger = createLogger(environment.LOG_LEVEL)
const database = environment.DATABASE_URL
  ? createDatabase(environment.DATABASE_URL)
  : null
const items = database
  ? createItemsModule({ repository: createDrizzleItemsRepository(database) })
  : undefined
const enrichmentRetry = database
  ? createEnrichmentRetryModule({
      repository: createDrizzleEnrichmentRetryRepository(database),
    })
  : undefined

const app = createApp({
  checkReadiness: async () => {
    if (!database) {
      throw new Error('Database configuration is unavailable.')
    }

    await checkDatabaseConnection(database)
  },
  ...(enrichmentRetry ? { enrichmentRetry } : {}),
  ...(items ? { items } : {}),
  logger,
  trustedOrigin: environment.APP_ORIGIN,
})

const server = serve({
  fetch: app.fetch,
  port: environment.PORT,
})

logger.info('http.server.started', {
  environment: environment.NODE_ENV,
  port: environment.PORT,
})

let isShuttingDown = false

function shutDown(signal: NodeJS.Signals): void {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  logger.info('http.server.stopping', { signal })

  server.close((serverError) => {
    const closeDatabase = database
      ? closeDatabaseConnection(database)
      : Promise.resolve()

    void closeDatabase.finally(() => {
      if (serverError) {
        logger.error('http.server.stop_failed', { signal })
        process.exitCode = 1
      }
    })
  })
}

process.once('SIGINT', shutDown)
process.once('SIGTERM', shutDown)
