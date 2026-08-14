export type GoogleIdentityErrorCode =
  'cancelled' | 'configuration' | 'unavailable'

export class GoogleIdentityError extends Error {
  readonly code: GoogleIdentityErrorCode

  constructor(code: GoogleIdentityErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'GoogleIdentityError'
  }
}

export function classifyGoogleIdentityError(
  error: unknown,
): GoogleIdentityError {
  const message = error instanceof Error ? error.message.toLowerCase() : ''

  if (
    message.includes('cancel') ||
    message.includes('did not approve') ||
    message.includes('not approved')
  ) {
    return new GoogleIdentityError(
      'cancelled',
      'Google sign-in was closed before it finished.',
    )
  }

  if (
    message.includes('oauth') ||
    message.includes('client id') ||
    message.includes('client_id') ||
    message.includes('manifest')
  ) {
    return new GoogleIdentityError(
      'configuration',
      'Chrome rejected the configured OAuth client.',
    )
  }

  return new GoogleIdentityError(
    'unavailable',
    'Chrome could not complete Google sign-in.',
  )
}
