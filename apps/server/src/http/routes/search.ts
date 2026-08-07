import type { SearchResponse } from '@cerebero/contracts'
import { searchQuerySchema } from '@cerebero/contracts'
import { Hono } from 'hono'

import type { AppEnvironment } from '../environment.js'
import { AppError } from '../errors.js'
import { toUserId } from '../../modules/items/item-types.js'
import type { SearchModule } from '../../modules/search/search-types.js'
import { SearchError } from '../../modules/search/search-types.js'

async function callSearch<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof SearchError) {
      throw new AppError({
        code: error.code,
        message: error.message,
        status: 400,
      })
    }

    throw error
  }
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

export function createSearchRoutes(search: SearchModule): Hono<AppEnvironment> {
  const routes = new Hono<AppEnvironment>()

  routes.get('/', async (context) => {
    const actor = requireActor(context.get('authSession'))
    const rawQuery = context.req.queries()
    const queryInput: Record<string, string | string[] | undefined> = {}
    for (const [key, values] of Object.entries(rawQuery)) {
      if (values.length === 1) {
        queryInput[key] = values[0]
      } else if (values.length > 1) {
        queryInput[key] = values
      }
    }

    const parsed = searchQuerySchema.safeParse(queryInput)
    if (!parsed.success) {
      throw new AppError({
        code: 'INVALID_REQUEST',
        message: 'The search query is invalid.',
        status: 400,
      })
    }

    const response: SearchResponse = await callSearch(() =>
      search.search(actor, parsed.data),
    )
    return context.json(response)
  })

  return routes
}
