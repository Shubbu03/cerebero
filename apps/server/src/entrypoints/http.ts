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
import { createAuthModule } from '../modules/auth/auth.js'
import { createDrizzleItemsRepository } from '../modules/items/drizzle-items-repository.js'
import { createItemsModule } from '../modules/items/items.js'
import { createDrizzleSearchRepository } from '../modules/search/drizzle-search-repository.js'
import { createSearchModule } from '../modules/search/search.js'
import { createDrizzleShareLinksRepository } from '../modules/sharing/drizzle-share-links-repository.js'
import { createSharingModule } from '../modules/sharing/sharing.js'
import { createDrizzleTagsRepository } from '../modules/tags/drizzle-tags-repository.js'
import { createTagsModule } from '../modules/tags/tags.js'

const environment = parseEnvironment(process.env)
const logger = createLogger(environment.LOG_LEVEL)
const database = environment.DATABASE_URL
  ? createDatabase(environment.DATABASE_URL)
  : null
const auth =
  database && environment.AUTH_SECRET
    ? createAuthModule({
        apiOrigin: environment.API_ORIGIN,
        database,
        ...(environment.GOOGLE_CLIENT_ID && environment.GOOGLE_CLIENT_SECRET
          ? {
              google: {
                clientId: environment.GOOGLE_CLIENT_ID,
                clientSecret: environment.GOOGLE_CLIENT_SECRET,
              },
            }
          : {}),
        logger,
        secret: environment.AUTH_SECRET,
        secureCookies: environment.NODE_ENV === 'production',
        webOrigin: environment.APP_ORIGIN,
      })
    : undefined

const shareLinksRepository = database
  ? createDrizzleShareLinksRepository(database)
  : null
const sharing = shareLinksRepository
  ? createSharingModule({ repository: shareLinksRepository })
  : undefined

const items = database
  ? createItemsModule({
      repository: createDrizzleItemsRepository(database),
      ...(sharing
        ? {
            revokeShareLinks: (itemId) => sharing.revokeForLifecycle(itemId),
          }
        : {}),
    })
  : undefined
const tags = database
  ? createTagsModule({ repository: createDrizzleTagsRepository(database) })
  : undefined
const search = database
  ? createSearchModule({
      repository: createDrizzleSearchRepository(database),
    })
  : undefined
const app = createApp({
  ...(auth ? { auth } : {}),
  checkReadiness: async () => {
    if (!database) {
      throw new Error('Database configuration is unavailable.')
    }

    await checkDatabaseConnection(database)
  },
  ...(items ? { items } : {}),
  ...(search ? { search } : {}),
  ...(sharing ? { sharing } : {}),
  ...(tags ? { tags } : {}),
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
