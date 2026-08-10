export type TagMutationErrorCode = 'duplicate' | 'not_found' | 'unavailable'

export class TagMutationError extends Error {
  readonly code: TagMutationErrorCode

  constructor(code: TagMutationErrorCode, message: string) {
    super(message)
    this.name = 'TagMutationError'
    this.code = code
  }
}
