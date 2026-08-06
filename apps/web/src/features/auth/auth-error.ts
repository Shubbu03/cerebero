type AuthClientError = {
  code?: string | undefined
  message?: string | undefined
  status?: number | undefined
}

export function getAuthErrorMessage(
  error: AuthClientError | null,
  fallback: string,
): string {
  if (!error) {
    return fallback
  }

  if (error.status === 503) {
    return 'Authentication is not configured on the backend yet.'
  }

  if (error.status === 429) {
    return 'Too many attempts. Wait a minute and try again.'
  }

  if (error.status === 403) {
    return 'Verify your email address before signing in.'
  }

  return fallback
}
