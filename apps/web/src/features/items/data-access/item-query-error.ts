export class ItemQueryError extends Error {
  readonly code: 'not_found' | 'unavailable'

  constructor(code: 'not_found' | 'unavailable') {
    super(
      code === 'not_found'
        ? 'This Item is unavailable.'
        : 'This Item could not be opened. Try again.',
    )
    this.name = 'ItemQueryError'
    this.code = code
  }
}
