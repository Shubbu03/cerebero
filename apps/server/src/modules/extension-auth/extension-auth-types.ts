import type {
  ExtensionGoogleAuthResponse,
  ExtensionScope,
  ExtensionSession,
  PublicUser,
} from '@cerebero/contracts'

import type { UserId } from '../items/item-types.js'

declare const extensionSessionIdBrand: unique symbol

export type ExtensionSessionId = string & {
  readonly [extensionSessionIdBrand]: true
}

export function toExtensionSessionId(value: string): ExtensionSessionId {
  return value as ExtensionSessionId
}

export type ExistingGoogleUser = PublicUser & {
  googleSubject: string
  id: UserId
}

export type ExtensionSessionRecord = {
  createdAt: Date
  expiresAt: Date
  id: ExtensionSessionId
  lastUsedAt: Date
  revokedAt: Date | null
  scopes: ExtensionScope[]
  tokenHash: string
  userId: UserId
}

export type ActiveExtensionSession = ExtensionSessionRecord & {
  user: PublicUser
}

export interface ExtensionSessionsRepository {
  create(record: ExtensionSessionRecord): Promise<ActiveExtensionSession>
  findActiveByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<ActiveExtensionSession | null>
  findExistingGoogleUser(subject: string): Promise<ExistingGoogleUser | null>
  revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<boolean>
  touchLastUsed(
    id: ExtensionSessionId,
    lastUsedAt: Date,
    staleBefore: Date,
  ): Promise<void>
}

export type VerifiedGoogleIdentity = {
  email: string
  subject: string
}

export interface GoogleIdentityVerifier {
  verify(accessToken: string): Promise<VerifiedGoogleIdentity>
}

export interface ExtensionAuthModule {
  authenticate(token: string): Promise<ExtensionSession | null>
  exchangeGoogleAccessToken(
    accessToken: string,
  ): Promise<ExtensionGoogleAuthResponse>
  logout(token: string): Promise<void>
}

export type ExtensionAuthErrorCode =
  | 'ACCOUNT_NOT_CONNECTED'
  | 'GOOGLE_TOKEN_INVALID'
  | 'GOOGLE_TOKEN_VERIFICATION_UNAVAILABLE'

export class ExtensionAuthError extends Error {
  readonly code: ExtensionAuthErrorCode

  constructor(code: ExtensionAuthErrorCode, message: string) {
    super(message)
    this.name = 'ExtensionAuthError'
    this.code = code
  }
}
