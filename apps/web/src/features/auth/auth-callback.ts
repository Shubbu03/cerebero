export type AuthCallbackPath = '/library'

export function getAuthCallbackUrl(
  path: AuthCallbackPath = '/library',
): string {
  return new URL(path, window.location.origin).toString()
}
