import { createHash } from 'node:crypto'

import type {
  RateLimitModule,
  RateLimitRepository,
} from './rate-limit-types.js'

type CreateRateLimitModuleOptions = {
  now?: () => number
  repository: RateLimitRepository
}

function storageKey(scope: string, subject: string): string {
  return `cerebero-api:${scope}:${createHash('sha256').update(subject).digest('hex')}`
}

export function createRateLimitModule({
  now = Date.now,
  repository,
}: CreateRateLimitModuleOptions): RateLimitModule {
  return {
    async consume({ policy, subject }) {
      const requestedAt = now()
      const record = await repository.increment({
        key: storageKey(policy.scope, subject),
        now: requestedAt,
        resetBefore: requestedAt - policy.windowMs,
      })
      const resetAt = record.windowStartedAt + policy.windowMs
      const allowed = record.count <= policy.limit

      return {
        allowed,
        limit: policy.limit,
        remaining: Math.max(0, policy.limit - record.count),
        resetAt,
        retryAfterSeconds: allowed
          ? 0
          : Math.max(1, Math.ceil((resetAt - requestedAt) / 1_000)),
      }
    },
  }
}
