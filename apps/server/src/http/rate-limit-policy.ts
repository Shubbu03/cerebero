import type { RateLimitPolicy } from '../modules/rate-limit/rate-limit-types.js'

export type RequestRateLimit = {
  policy: RateLimitPolicy
  subject: 'global' | 'public-token' | 'user'
}

const oneMinute = 60_000

const policies = {
  capture: { limit: 30, scope: 'capture', windowMs: oneMinute },
  duplicateCheck: {
    limit: 60,
    scope: 'duplicate-check',
    windowMs: oneMinute,
  },
  itemActions: { limit: 60, scope: 'item-actions', windowMs: oneMinute },
  publicGlobal: {
    limit: 600,
    scope: 'public-share-global',
    windowMs: oneMinute,
  },
  publicToken: {
    limit: 30,
    scope: 'public-share-token',
    windowMs: oneMinute,
  },
  search: { limit: 60, scope: 'search', windowMs: oneMinute },
  shareMutation: {
    limit: 20,
    scope: 'share-mutation',
    windowMs: oneMinute,
  },
} satisfies Record<string, RateLimitPolicy>

const itemActionPath = /^\/api\/v1\/items\/[^/]+\/actions$/
const itemShareMutationPath = /^\/api\/v1\/items\/[^/]+\/share(?:\/rotate)?$/
const publicSharePath = /^\/api\/v1\/public\/shares\/([^/]+)$/

export function requestRateLimits(
  method: string,
  path: string,
): RequestRateLimit[] {
  if (method === 'POST' && path === '/api/v1/items') {
    return [{ policy: policies.capture, subject: 'user' }]
  }

  if (method === 'POST' && path === '/api/v1/items/duplicates/check') {
    return [{ policy: policies.duplicateCheck, subject: 'user' }]
  }

  if (method === 'GET' && path === '/api/v1/search') {
    return [{ policy: policies.search, subject: 'user' }]
  }

  if (['POST', 'DELETE'].includes(method) && itemShareMutationPath.test(path)) {
    return [{ policy: policies.shareMutation, subject: 'user' }]
  }

  if (method === 'POST' && itemActionPath.test(path)) {
    return [{ policy: policies.itemActions, subject: 'user' }]
  }

  const publicShareMatch = method === 'GET' ? publicSharePath.exec(path) : null
  if (publicShareMatch?.[1]) {
    return [
      { policy: policies.publicGlobal, subject: 'global' },
      { policy: policies.publicToken, subject: 'public-token' },
    ]
  }

  return []
}
