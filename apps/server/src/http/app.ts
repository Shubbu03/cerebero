import { randomUUID } from 'node:crypto'

import type {
  ApiError,
  ApiErrorCode,
  HealthResponse,
} from '@cerebero/contracts'
import { Hono, type MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

import {
  getPrincipalUserId,
  hasExtensionScope,
  parseBearerToken,
} from './authentication.js'
import { AppError } from './errors.js'
import type { AppEnvironment } from './environment.js'
import { createExtensionAuthRoutes } from './routes/extension-auth.js'
import { createItemsRoutes } from './routes/items.js'
import { createSearchRoutes } from './routes/search.js'
import { createPublicSharingRoutes } from './routes/sharing.js'
import { createTagsRoutes } from './routes/tags.js'
import type { AppLogger } from '../infrastructure/logging/logger.js'
import type { AuthRuntime } from '../modules/auth/auth.js'
import type { ExtensionAuthModule } from '../modules/extension-auth/extension-auth-types.js'
import type { ItemsModule } from '../modules/items/item-types.js'
import type { SearchModule } from '../modules/search/search-types.js'
import type { SharingModule } from '../modules/sharing/share-types.js'
import type { TagsModule } from '../modules/tags/tag-types.js'
import type { RateLimitModule } from '../modules/rate-limit/rate-limit-types.js'
import { requestRateLimits } from './rate-limit-policy.js'

type AppOptions = {
  auth?: AuthRuntime
  checkReadiness: () => Promise<void>
  extensionAuth?: ExtensionAuthModule
  items?: ItemsModule
  logger: AppLogger
  rateLimit?: RateLimitModule
  search?: SearchModule
  sharing?: SharingModule
  tags?: TagsModule
  trustedOrigin: string
}

const statusByErrorCode: Record<
  ApiErrorCode,
  400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 500 | 503
> = {
  AUTH_UNAVAILABLE: 503,
  DUPLICATE_ITEM: 409,
  DUPLICATE_TAG: 409,
  EDIT_CONFLICT: 409,
  FORBIDDEN: 403,
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

function timingMetric(name: string, startedAt: number): string {
  return `${name};dur=${(performance.now() - startedAt).toFixed(1)}`
}

export function createApp(options: AppOptions): Hono<AppEnvironment> {
  const app = new Hono<AppEnvironment>()

  app.use('*', async (context, next) => {
    const requestId = randomUUID()
    context.set('requestId', requestId)
    context.set('serverTimings', [])
    context.header('X-Request-Id', requestId)
    await next()
  })

  // Outermost for public shares so privacy headers win over global defaults.
  app.use('/api/v1/public/*', async (context, next) => {
    try {
      await next()
    } finally {
      context.header('X-Robots-Tag', 'noindex, nofollow')
      context.header('Cache-Control', 'private, no-store')
      context.header('Referrer-Policy', 'no-referrer')
      context.header('Cross-Origin-Resource-Policy', 'same-site')
    }
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
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      exposeHeaders: [
        'RateLimit-Limit',
        'RateLimit-Remaining',
        'RateLimit-Reset',
        'Retry-After',
        'Server-Timing',
        'X-Request-Id',
      ],
      maxAge: 600,
      origin: options.trustedOrigin,
    }),
  )

  app.use('*', async (context, next) => {
    const startedAt = performance.now()
    await next()

    const durationMs = performance.now() - startedAt
    const timings = context.get('serverTimings')
    timings.push(`total;dur=${durationMs.toFixed(1)}`)
    context.header('Server-Timing', timings.join(', '))

    options.logger.info('http.request.completed', {
      durationMs: Math.round(durationMs),
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
    if (context.req.path.startsWith('/api/v1/public/')) {
      context.set('authPrincipal', null)
      await next()
      return
    }

    if (context.req.path === '/api/v1/extension/auth/google') {
      context.set('authPrincipal', null)
      await next()
      return
    }

    const startedAt = performance.now()
    try {
      const authorization = context.req.header('Authorization')
      if (authorization) {
        const token = parseBearerToken(authorization)
        const session =
          token && options.extensionAuth
            ? await options.extensionAuth.authenticate(token)
            : null
        context.set(
          'authPrincipal',
          session ? { kind: 'extension', session } : null,
        )
      } else if (options.auth) {
        const session = await options.auth.getSession(context.req.raw.headers)
        context.set('authPrincipal', session ? { kind: 'web', session } : null)
      } else {
        context.set('authPrincipal', null)
      }
    } catch {
      throw new AppError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Authentication could not be verified.',
        status: 503,
      })
    } finally {
      context.get('serverTimings').push(timingMetric('auth', startedAt))
    }

    await next()
  })

  app.use('/api/v1/*', async (context, next) => {
    if (!options.rateLimit) {
      await next()
      return
    }

    const startedAt = performance.now()
    const limits = requestRateLimits(context.req.method, context.req.path)
    const principal = context.get('authPrincipal')

    for (const limit of limits) {
      const publicToken = context.req.path.split('/').at(-1) ?? 'unknown'
      const subject =
        limit.subject === 'global'
          ? 'all-public-share-requests'
          : limit.subject === 'public-token'
            ? publicToken
            : principal
              ? getPrincipalUserId(principal)
              : 'unauthenticated'
      const result = await options.rateLimit.consume({
        policy: limit.policy,
        subject,
      })

      context.header('RateLimit-Limit', String(result.limit))
      context.header('RateLimit-Remaining', String(result.remaining))
      context.header(
        'RateLimit-Reset',
        String(Math.ceil(result.resetAt / 1_000)),
      )

      if (!result.allowed) {
        throw new AppError({
          code: 'RATE_LIMITED',
          message: 'Too many requests. Try again shortly.',
          retryAfterSeconds: result.retryAfterSeconds,
          status: 429,
        })
      }
    }

    context.get('serverTimings').push(timingMetric('rateLimit', startedAt))
    await next()
  })

  app.use('/api/v1/*', async (context, next) => {
    const startedAt = performance.now()
    await next()
    context.get('serverTimings').push(timingMetric('handler', startedAt))
  })

  app.get('/api/v1/session', (context) => {
    if (!options.auth) {
      throw new AppError({
        code: 'AUTH_UNAVAILABLE',
        message: 'Authentication is not configured yet.',
        status: 503,
      })
    }

    const principal = context.get('authPrincipal')
    if (!principal) {
      throw new AppError({
        code: 'UNAUTHENTICATED',
        message: 'Sign in is required.',
        status: 401,
      })
    }

    if (principal.kind !== 'web') {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'This endpoint requires a Web Session.',
        status: 403,
      })
    }

    return context.json(principal.session)
  })

  const requireItemsAccess: MiddlewareHandler<AppEnvironment> = async (
    context,
    next,
  ) => {
    if (!options.auth && !options.extensionAuth) {
      throw new AppError({
        code: 'AUTH_UNAVAILABLE',
        message: 'Authentication is not configured yet.',
        status: 503,
      })
    }

    const principal = context.get('authPrincipal')
    if (!principal) {
      throw new AppError({
        code: 'UNAUTHENTICATED',
        message: 'Sign in is required.',
        status: 401,
      })
    }

    if (principal.kind === 'extension') {
      const requiredScope =
        context.req.method === 'POST' && context.req.path === '/api/v1/items'
          ? 'items:create'
          : context.req.method === 'POST' &&
              context.req.path === '/api/v1/items/duplicates/check'
            ? 'items:duplicates:check'
            : null

      if (!requiredScope || !hasExtensionScope(principal, requiredScope)) {
        throw new AppError({
          code: 'FORBIDDEN',
          message: 'The Extension Session cannot access this endpoint.',
          status: 403,
        })
      }
    }

    if (!options.items) {
      throw new AppError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Item storage is not configured yet.',
        status: 503,
      })
    }

    await next()
  }
  app.use('/api/v1/items', requireItemsAccess)
  app.use('/api/v1/items/*', requireItemsAccess)

  const requireTagsAccess: MiddlewareHandler<AppEnvironment> = async (
    context,
    next,
  ) => {
    if (!options.auth) {
      throw new AppError({
        code: 'AUTH_UNAVAILABLE',
        message: 'Authentication is not configured yet.',
        status: 503,
      })
    }

    const principal = context.get('authPrincipal')
    if (!principal) {
      throw new AppError({
        code: 'UNAUTHENTICATED',
        message: 'Sign in is required.',
        status: 401,
      })
    }

    if (principal.kind !== 'web') {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'This endpoint requires a Web Session.',
        status: 403,
      })
    }

    if (!options.tags) {
      throw new AppError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Tag storage is not configured yet.',
        status: 503,
      })
    }

    await next()
  }
  app.use('/api/v1/tags', requireTagsAccess)
  app.use('/api/v1/tags/*', requireTagsAccess)

  if (options.items) {
    app.route(
      '/api/v1/items',
      createItemsRoutes(options.items, options.tags, options.sharing),
    )
  }

  if (options.tags) {
    app.route('/api/v1/tags', createTagsRoutes(options.tags))
  }

  if (options.extensionAuth) {
    app.route(
      '/api/v1/extension',
      createExtensionAuthRoutes(options.extensionAuth),
    )
  } else {
    app.all('/api/v1/extension/*', () => {
      throw new AppError({
        code: 'AUTH_UNAVAILABLE',
        message: 'Extension authentication is not configured yet.',
        status: 503,
      })
    })
  }

  if (options.sharing) {
    // Public shares are intentionally unauthenticated.
    app.route(
      '/api/v1/public/shares',
      createPublicSharingRoutes(options.sharing),
    )
  }

  const requireSearchAccess: MiddlewareHandler<AppEnvironment> = async (
    context,
    next,
  ) => {
    if (!options.auth) {
      throw new AppError({
        code: 'AUTH_UNAVAILABLE',
        message: 'Authentication is not configured yet.',
        status: 503,
      })
    }

    const principal = context.get('authPrincipal')
    if (!principal) {
      throw new AppError({
        code: 'UNAUTHENTICATED',
        message: 'Sign in is required.',
        status: 401,
      })
    }

    if (principal.kind !== 'web') {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'This endpoint requires a Web Session.',
        status: 403,
      })
    }

    if (!options.search) {
      throw new AppError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Search is not configured yet.',
        status: 503,
      })
    }

    await next()
  }
  app.use('/api/v1/search', requireSearchAccess)
  app.use('/api/v1/search/*', requireSearchAccess)

  if (options.search) {
    app.route('/api/v1/search', createSearchRoutes(options.search))
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
