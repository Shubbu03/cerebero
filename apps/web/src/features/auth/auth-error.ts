type AuthClientError = {
  code?: string | undefined
  message?: string | undefined
  status?: number | undefined
}

function asAuthClientError(error: unknown): AuthClientError | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const candidate = error as Record<string, unknown>
  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    message:
      typeof candidate.message === 'string' ? candidate.message : undefined,
    status: typeof candidate.status === 'number' ? candidate.status : undefined,
  }
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const authError = asAuthClientError(error)
  if (!authError) {
    return fallback
  }

  if (authError.status === 503) {
    return 'Authentication is not configured on the backend yet.'
  }

  if (authError.status === 429) {
    return 'Too many attempts. Wait a minute and try again.'
  }

  return fallback
}

export function getAccountDeletionErrorMessage(error: unknown): string {
  const authError = asAuthClientError(error)

  if (
    authError?.code === 'SESSION_EXPIRED' ||
    authError?.message?.toLowerCase().includes('session expired')
  ) {
    return 'For security, sign out and sign in again before deleting your account.'
  }

  if (authError?.status === 429) {
    return 'Too many attempts. Wait a minute and try again.'
  }

  return 'Account deletion could not be completed. Try again.'
}
