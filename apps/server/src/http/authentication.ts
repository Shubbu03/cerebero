import type {
  AuthenticatedSession,
  ExtensionScope,
  ExtensionSession,
} from '@cerebero/contracts'

import { toUserId, type UserId } from '../modules/items/item-types.js'

export type WebRequestPrincipal = {
  kind: 'web'
  session: AuthenticatedSession
}

export type ExtensionRequestPrincipal = {
  kind: 'extension'
  session: ExtensionSession
}

export type RequestPrincipal = ExtensionRequestPrincipal | WebRequestPrincipal

export function getPrincipalUserId(principal: RequestPrincipal): UserId {
  return toUserId(
    principal.kind === 'web'
      ? principal.session.session.userId
      : principal.session.user.id,
  )
}

export function hasExtensionScope(
  principal: ExtensionRequestPrincipal,
  scope: ExtensionScope,
): boolean {
  return principal.session.scopes.includes(scope)
}

export function parseBearerToken(authorization: string | undefined) {
  if (!authorization) {
    return null
  }

  const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(authorization)
  return match?.[1] ?? null
}
