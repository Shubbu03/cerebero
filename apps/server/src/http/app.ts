import { randomUUID } from 'node:crypto'

import type {
  ApiError,
  ApiErrorCode,
  HealthResponse,
} from '@cerebero/contracts'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

import { AppError } from './errors.js'
import type { AppEnvironment } from './environment.js'
import { createItemsRoutes } from './routes/items.js'
import type { AppLogger } from '../infrastructure/logging/logger.js'
import type { AuthRuntime } from '../modules/auth/auth.js'
import type { EnrichmentRetryModule } from '../modules/enrichment/enrichment-retry.js'
import type { ItemsModule } from '../modules/items/item-types.js'

type AppOptions = {
  auth?: AuthRuntime
  checkReadiness: () => Promise<void>
  enrichmentRetry?: EnrichmentRetryModule
  items?: ItemsModule
  logger: AppLogger
  trustedOrigin: string
}

const statusByErrorCode: Record<
  ApiErrorCode,
  400 | 401 | 404 | 409 | 413 | 415 | 429 | 500 | 503
> = {
  AUTH_UNAVAILABLE: 503,
  DUPLICATE_ITEM: 409,
  EDIT_CONFLICT: 409,
  INTERNAL_ERROR: 500,
  INVALID_REQUEST: 400,
  INVALID_ITEM_STATE: 409,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  UNAUTHENTICATED: 401,
  UNSUPPORTED_MEDIA_TYPE: 415,
}

function errorBody(
  code: ApiErrorCode,
  message: string,
  requestId: string,
): ApiError {
  return {
    error: {
      code,
      message,
      requestId,
    },
  }
}

export function createApp(options: AppOptions): Hono<AppEnvironment> {
  const app = new Hono<AppEnvironment>()

  app.use('*', async (context, next) => {
    const requestId = randomUUID()
    context.set('requestId', requestId)
    context.header('X-Request-Id', requestId)
    await next()
  })

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
      },
      crossOriginOpenerPolicy: 'same-origin',
      crossOriginResourcePolicy: 'same-origin',
      referrerPolicy: 'strict-origin-when-cross-origin',
      strictTransportSecurity: 'max-age=31536000; includeSubDomains',
      xContentTypeOptions: 'nosniff',
      xFrameOptions: 'DENY',
    }),
  )

  app.use(
    '/api/*',
    cors({
      allowHeaders: ['Content-Type'],
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      exposeHeaders: ['Retry-After', 'X-Request-Id'],
      maxAge: 600,
      origin: options.trustedOrigin,
    }),
  )

  app.use('*', async (context, next) => {
    const startedAt = performance.now()
    await next()

    options.logger.info('http.request.completed', {
      durationMs: Math.round(performance.now() - startedAt),
      method: context.req.method,
      path: context.req.path,
      requestId: context.get('requestId'),
      status: context.res.status,
    })
  })

  app.get('/health/live', (context) => {
    const body: HealthResponse = { status: 'ok' }
    return context.json(body)
  })

  app.get('/health/ready', async (context) => {
    try {
      await options.checkReadiness()
      const body: HealthResponse = { status: 'ok' }
      return context.json(body)
    } catch {
      const requestId = context.get('requestId')
      options.logger.error('health.readiness.failed', { requestId })

      return context.json(
        errorBody(
          'SERVICE_UNAVAILABLE',
          'The service is not ready.',
          requestId,
        ),
        503,
      )
    }
  })

  app.on(['GET', 'POST'], '/api/auth/*', (context) => {
    if (!options.auth) {
      const requestId = context.get('requestId')
      return context.json(
        errorBody(
          'AUTH_UNAVAILABLE',
          'Authentication is not configured yet.',
          requestId,
        ),
        503,
      )
    }

    return options.auth.handler(context.req.raw)
  })

  app.use('/api/v1/*', async (context, next) => {
    if (!options.auth) {
      context.set('authSession', null)
      await next()
      return
    }

    try {
      const authSession = await options.auth.getSession(context.req.raw.headers)
      context.set('authSession', authSession)
      await next()
    } catch {
      throw new AppError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Authentication could not be verified.',
        status: 503,
      })
    }
  })

  app.get('/api/v1/session', (context) => {
    if (!options.auth) {
      throw new AppError({
        code: 'AUTH_UNAVAILABLE',
        message: 'Authentication is not configured yet.',
        status: 503,
      })
    }

    const authSession = context.get('authSession')
    if (!authSession) {
      throw new AppError({
        code: 'UNAUTHENTICATED',
        message: 'Sign in is required.',
        status: 401,
      })
    }

    return context.json(authSession)
  })

  app.use('/api/v1/items*', async (context, next) => {
    if (!options.auth) {
      throw new AppError({
        code: 'AUTH_UNAVAILABLE',
        message: 'Authentication is not configured yet.',
        status: 503,
      })
    }

    if (!context.get('authSession')) {
      throw new AppError({
        code: 'UNAUTHENTICATED',
        message: 'Sign in is required.',
        status: 401,
      })
    }

    if (!options.items) {
      throw new AppError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Item storage is not configured yet.',
        status: 503,
      })
    }

    await next()
  })

  if (options.items) {
    app.route(
      '/api/v1/items',
      createItemsRoutes(options.items, options.enrichmentRetry),
    )
  }

  app.notFound((context) =>
    context.json(
      errorBody(
        'NOT_FOUND',
        'The requested resource was not found.',
        context.get('requestId'),
      ),
      404,
    ),
  )

  app.onError((error, context) => {
    const requestId = context.get('requestId')

    if (error instanceof AppError) {
      options.logger.warn('http.request.rejected', {
        code: error.code,
        requestId,
      })
      if (error.retryAfterSeconds !== null) {
        context.header('Retry-After', String(error.retryAfterSeconds))
      }

      return context.json(
        errorBody(error.code, error.message, requestId),
        error.status,
      )
    }

    options.logger.error('http.request.failed', {
      code: 'INTERNAL_ERROR',
      requestId,
    })

    return context.json(
      errorBody('INTERNAL_ERROR', 'An unexpected error occurred.', requestId),
      statusByErrorCode.INTERNAL_ERROR,
    )
  })

  return app
}
