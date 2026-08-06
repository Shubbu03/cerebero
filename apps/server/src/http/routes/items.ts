import type {
  DuplicateCheckResponse,
  DuplicateItemResponse,
  EnrichmentRetryResponse,
  ItemView,
} from '@cerebero/contracts'
import {
  captureItemInputSchema,
  duplicateCheckInputSchema,
  itemCommandSchema,
  itemIdSchema,
  listItemsQuerySchema,
  updateItemInputSchema,
} from '@cerebero/contracts'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { z } from 'zod'

import type { AppEnvironment } from '../environment.js'
import { AppError } from '../errors.js'
import type { ItemsModule } from '../../modules/items/item-types.js'
import type { EnrichmentRetryModule } from '../../modules/enrichment/enrichment-retry.js'
import { EnrichmentRetryError } from '../../modules/enrichment/enrichment-retry.js'
import {
  ItemsError,
  toItemId,
  toUserId,
} from '../../modules/items/item-types.js'

const MAX_ITEM_REQUEST_BYTES = 128 * 1_024

function toAppError(error: ItemsError): AppError {
  switch (error.code) {
    case 'EDIT_CONFLICT':
      return new AppError({
        code: error.code,
        message: error.message,
        status: 409,
      })
    case 'INVALID_ITEM_STATE':
      return new AppError({
        code: error.code,
        message: error.message,
        status: 409,
      })
    case 'INVALID_REQUEST':
      return new AppError({
        code: error.code,
        message: error.message,
        status: 400,
      })
    case 'NOT_FOUND':
      return new AppError({
        code: error.code,
        message: error.message,
        status: 404,
      })
  }
}

async function callItems<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof ItemsError) {
      throw toAppError(error)
    }

    throw error
  }
}

async function callEnrichmentRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof EnrichmentRetryError) {
      switch (error.code) {
        case 'NOT_FOUND':
          throw new AppError({
            code: error.code,
            message: error.message,
            status: 404,
          })
        case 'INVALID_ITEM_STATE':
          throw new AppError({
            code: error.code,
            message: error.message,
            status: 409,
          })
        case 'RATE_LIMITED':
          if (error.retryAfterSeconds === null) {
            throw new Error('A rate limit error requires a retry delay.', {
              cause: error,
            })
          }
          throw new AppError({
            code: error.code,
            message: error.message,
            retryAfterSeconds: error.retryAfterSeconds,
            status: 429,
          })
      }
    }

    throw error
  }
}

async function parseJson<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  const mediaType = request.headers
    .get('content-type')
    ?.split(';', 1)[0]
    ?.trim()
    .toLowerCase()

  if (mediaType !== 'application/json') {
    throw new AppError({
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Content-Type must be application/json.',
      status: 415,
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new AppError({
      code: 'INVALID_REQUEST',
      message: 'The JSON request body is invalid.',
      status: 400,
    })
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    throw new AppError({
      code: 'INVALID_REQUEST',
      message: 'The request is invalid.',
      status: 400,
    })
  }

  return result.data
}

function parseItemId(value: string) {
  const result = itemIdSchema.safeParse(value)
  if (!result.success) {
    throw new AppError({
      code: 'INVALID_REQUEST',
      message: 'The Item ID is invalid.',
      status: 400,
    })
  }

  return toItemId(result.data)
}

function requireActor(session: AppEnvironment['Variables']['authSession']) {
  if (!session) {
    throw new AppError({
      code: 'UNAUTHENTICATED',
      message: 'Sign in is required.',
      status: 401,
    })
  }

  return toUserId(session.session.userId)
}

const limitItemBody = bodyLimit({
  maxSize: MAX_ITEM_REQUEST_BYTES,
  onError: () => {
    throw new AppError({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The request body is too large.',
      status: 413,
    })
  },
})

export function createItemsRoutes(
  items: ItemsModule,
  enrichmentRetry?: EnrichmentRetryModule,
): Hono<AppEnvironment> {
  const routes = new Hono<AppEnvironment>()

  routes.post('/duplicates/check', limitItemBody, async (context) => {
    const actor = requireActor(context.get('authSession'))
    const input = await parseJson(context.req.raw, duplicateCheckInputSchema)
    const candidates = await callItems(() =>
      items.findDuplicateLinks(actor, input.url),
    )
    const response: DuplicateCheckResponse = { candidates }
    return context.json(response)
  })

  routes.post('/', limitItemBody, async (context) => {
    const actor = requireActor(context.get('authSession'))
    const input = await parseJson(context.req.raw, captureItemInputSchema)
    const result = await callItems(() => items.capture(actor, input))

    if (result.outcome === 'duplicate') {
      const response: DuplicateItemResponse = {
        candidates: result.candidates,
        error: {
          code: 'DUPLICATE_ITEM',
          message: 'A matching URL already exists.',
          requestId: context.get('requestId'),
        },
      }
      return context.json(response, 409)
    }

    return context.json(result.item, 201)
  })

  routes.get('/', async (context) => {
    const actor = requireActor(context.get('authSession'))
    const parsedQuery = listItemsQuerySchema.safeParse(context.req.query())
    if (!parsedQuery.success) {
      throw new AppError({
        code: 'INVALID_REQUEST',
        message: 'The Item list query is invalid.',
        status: 400,
      })
    }

    return context.json(
      await callItems(() => items.list(actor, parsedQuery.data)),
    )
  })

  routes.get('/:itemId', async (context) => {
    const actor = requireActor(context.get('authSession'))
    const item = await callItems(() =>
      items.get(actor, parseItemId(context.req.param('itemId'))),
    )
    if (!item) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'The requested Item was not found.',
        status: 404,
      })
    }

    return context.json(item)
  })

  if (enrichmentRetry) {
    routes.post('/:itemId/enrichment/retry', async (context) => {
      const actor = requireActor(context.get('authSession'))
      const enrichment = await callEnrichmentRetry(() =>
        enrichmentRetry.retry(actor, parseItemId(context.req.param('itemId'))),
      )
      const response: EnrichmentRetryResponse = { enrichment }
      return context.json(response)
    })
  }

  routes.patch('/:itemId', limitItemBody, async (context) => {
    const actor = requireActor(context.get('authSession'))
    const itemId = parseItemId(context.req.param('itemId'))
    const input = await parseJson(context.req.raw, updateItemInputSchema)
    const item: ItemView = await callItems(() =>
      items.update(actor, itemId, input),
    )
    return context.json(item)
  })

  routes.post('/:itemId/actions', limitItemBody, async (context) => {
    const actor = requireActor(context.get('authSession'))
    const itemId = parseItemId(context.req.param('itemId'))
    const command = await parseJson(context.req.raw, itemCommandSchema)
    const item: ItemView = await callItems(() =>
      items.act(actor, itemId, command),
    )
    return context.json(item)
  })

  return routes
}
