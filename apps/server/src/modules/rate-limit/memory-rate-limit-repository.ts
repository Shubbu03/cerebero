import type {
  RateLimitRecord,
  RateLimitRepository,
} from './rate-limit-types.js'

export function createMemoryRateLimitRepository(): RateLimitRepository {
  const records = new Map<string, RateLimitRecord>()

  return {
    increment({ key, now, resetBefore }) {
      const existing = records.get(key)
      const next =
        !existing || existing.windowStartedAt < resetBefore
          ? { count: 1, windowStartedAt: now }
          : { ...existing, count: existing.count + 1 }

      records.set(key, next)
      return Promise.resolve(next)
    },
  }
}
