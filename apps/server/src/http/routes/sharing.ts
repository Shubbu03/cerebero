import type { ShareLinkCreated, ShareLinkStatus } from '@cerebero/contracts'
import { itemIdSchema } from '@cerebero/contracts'
import { Hono } from 'hono'

import type { AppEnvironment } from '../environment.js'
import { AppError } from '../errors.js'
import { toItemId, toUserId } from '../../modules/items/item-types.js'
import type { SharingModule } from '../../modules/sharing/share-types.js'
import { SharingError } from '../../modules/sharing/share-types.js'

function toAppError(error: SharingError): AppError {
  switch (error.code) {
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

async function callSharing<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof SharingError) {
      throw toAppError(error)
    }

    throw error
  }
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

/** Owner-scoped share management nested under /api/v1/items/:itemId/share* */
export function createItemSharingRoutes(
  sharing: SharingModule,
): Hono<AppEnvironment> {
  const routes = new Hono<AppEnvironment>()

  routes.get('/:itemId/share', async (context) => {
    const actor = requireActor(context.get('authSession'))
    const itemId = parseItemId(context.req.param('itemId'))
    const status: ShareLinkStatus = await callSharing(() =>
      sharing.getStatus(actor, itemId),
    )
    return context.json(status)
  })

  routes.post('/:itemId/share', async (context) => {
    const actor = requireActor(context.get('authSession'))
    const itemId = parseItemId(context.req.param('itemId'))
    const created: ShareLinkCreated = await callSharing(() =>
      sharing.create(actor, itemId),
    )
    return context.json(created, 201)
  })

  routes.delete('/:itemId/share', async (context) => {
    const actor = requireActor(context.get('authSession'))
    const itemId = parseItemId(context.req.param('itemId'))
    await callSharing(() => sharing.revoke(actor, itemId))
    return context.body(null, 204)
  })

  routes.post('/:itemId/share/rotate', async (context) => {
    const actor = requireActor(context.get('authSession'))
    const itemId = parseItemId(context.req.param('itemId'))
    const rotated: ShareLinkCreated = await callSharing(() =>
      sharing.rotate(actor, itemId),
    )
    return context.json(rotated)
  })

  return routes
}

/**
 * Public share resolution. Always returns the same generic unavailable state
 * for missing, revoked, inactive, or lifecycle-blocked links.
 */
export function createPublicSharingRoutes(
  sharing: SharingModule,
): Hono<AppEnvironment> {
  const routes = new Hono<AppEnvironment>()

  routes.get('/:token', async (context) => {
    // Public pages must not be indexed or framed into other sites.
    context.header('X-Robots-Tag', 'noindex, nofollow')
    context.header('Cache-Control', 'private, no-store')
    context.header('Referrer-Policy', 'no-referrer')
    context.header('Cross-Origin-Resource-Policy', 'same-site')

    const token = context.req.param('token')
    const item = await callSharing(() => sharing.resolvePublic(token))
    if (!item) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'This shared Item is unavailable.',
        status: 404,
      })
    }

    return context.json(item)
  })

  return routes
}
