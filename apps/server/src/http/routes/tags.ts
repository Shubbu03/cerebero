import type { TagList, TagView } from '@cerebero/contracts'
import {
  createTagInputSchema,
  renameTagInputSchema,
  tagIdSchema,
} from '@cerebero/contracts'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { z } from 'zod'

import type { AppEnvironment } from '../environment.js'
import { AppError } from '../errors.js'
import { toUserId } from '../../modules/items/item-types.js'
import type { TagsModule } from '../../modules/tags/tag-types.js'
import { TagsError, toTagId } from '../../modules/tags/tag-types.js'

const MAX_TAG_REQUEST_BYTES = 8 * 1_024

function toAppError(error: TagsError): AppError {
  switch (error.code) {
    case 'DUPLICATE_TAG':
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

async function callTags<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof TagsError) {
      throw toAppError(error)
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

function parseTagId(value: string) {
  const result = tagIdSchema.safeParse(value)
  if (!result.success) {
    throw new AppError({
      code: 'INVALID_REQUEST',
      message: 'The Tag ID is invalid.',
      status: 400,
    })
  }

  return toTagId(result.data)
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

const limitTagBody = bodyLimit({
  maxSize: MAX_TAG_REQUEST_BYTES,
  onError: () => {
    throw new AppError({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The request body is too large.',
      status: 413,
    })
  },
})

export function createTagsRoutes(tags: TagsModule): Hono<AppEnvironment> {
  const routes = new Hono<AppEnvironment>()

  routes.get('/', async (context) => {
    const actor = requireActor(context.get('authSession'))
    const response: TagList = await callTags(() => tags.list(actor))
    return context.json(response)
  })

  routes.post('/', limitTagBody, async (context) => {
    const actor = requireActor(context.get('authSession'))
    const input = await parseJson(context.req.raw, createTagInputSchema)
    const tag: TagView = await callTags(() => tags.create(actor, input))
    return context.json(tag, 201)
  })

  routes.patch('/:tagId', limitTagBody, async (context) => {
    const actor = requireActor(context.get('authSession'))
    const tagId = parseTagId(context.req.param('tagId'))
    const input = await parseJson(context.req.raw, renameTagInputSchema)
    const tag: TagView = await callTags(() => tags.rename(actor, tagId, input))
    return context.json(tag)
  })

  routes.delete('/:tagId', async (context) => {
    const actor = requireActor(context.get('authSession'))
    const tagId = parseTagId(context.req.param('tagId'))
    await callTags(() => tags.delete(actor, tagId))
    return context.body(null, 204)
  })

  return routes
}
