export type AuthCallbackPath = '/library' | '/reset-password' | '/verify-email'

export function getAuthCallbackUrl(path: AuthCallbackPath): string {
  return new URL(path, window.location.origin).toString()
}
