export type ItemMutationErrorCode =
  'conflict' | 'invalid_state' | 'not_found' | 'unavailable'

export class ItemMutationError extends Error {
  readonly code: ItemMutationErrorCode

  constructor(code: ItemMutationErrorCode, message: string) {
    super(message)
    this.name = 'ItemMutationError'
    this.code = code
  }
}
