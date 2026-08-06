import type { ApiErrorCode } from '@cerebero/contracts'

export class AppError extends Error {
  readonly code: ApiErrorCode
  readonly retryAfterSeconds: number | null
  readonly status: 400 | 401 | 404 | 409 | 413 | 415 | 429 | 503

  constructor(options: {
    code: ApiErrorCode
    message: string
    retryAfterSeconds?: number
    status: 400 | 401 | 404 | 409 | 413 | 415 | 429 | 503
  }) {
    super(options.message)
    this.name = 'AppError'
    this.code = options.code
    this.retryAfterSeconds = options.retryAfterSeconds ?? null
    this.status = options.status
  }
}
