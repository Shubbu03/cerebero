import type { ApiErrorCode } from '@cerebero/contracts'

export class AppError extends Error {
  readonly code: ApiErrorCode
  readonly status: 400 | 401 | 404 | 409 | 413 | 415 | 503

  constructor(options: {
    code: ApiErrorCode
    message: string
    status: 400 | 401 | 404 | 409 | 413 | 415 | 503
  }) {
    super(options.message)
    this.name = 'AppError'
    this.code = options.code
    this.status = options.status
  }
}
