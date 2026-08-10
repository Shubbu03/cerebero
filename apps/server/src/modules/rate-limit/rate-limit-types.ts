export type RateLimitPolicy = {
  limit: number
  scope: string
  windowMs: number
}

export type RateLimitConsumption = {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

export type RateLimitRecord = {
  count: number
  windowStartedAt: number
}

export interface RateLimitRepository {
  increment(input: {
    key: string
    now: number
    resetBefore: number
  }): Promise<RateLimitRecord>
}

export interface RateLimitModule {
  consume(input: {
    policy: RateLimitPolicy
    subject: string
  }): Promise<RateLimitConsumption>
}
