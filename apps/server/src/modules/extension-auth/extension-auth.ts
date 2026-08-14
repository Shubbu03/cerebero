import { randomUUID } from 'node:crypto'

import type {
  ExtensionGoogleAuthResponse,
  ExtensionScope,
  ExtensionSession,
} from '@cerebero/contracts'

import type {
  ActiveExtensionSession,
  ExtensionAuthModule,
  ExtensionSessionsRepository,
  GoogleIdentityVerifier,
} from './extension-auth-types.js'
import {
  ExtensionAuthError,
  toExtensionSessionId,
} from './extension-auth-types.js'
import {
  createExtensionTokenMaterial,
  hashExtensionToken,
  isExtensionToken,
  type ExtensionTokenMaterial,
} from './token.js'

const EXTENSION_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1_000
const LAST_USED_WRITE_INTERVAL_MS = 15 * 60 * 1_000

export const EXTENSION_CAPTURE_SCOPES = [
  'items:create',
  'items:duplicates:check',
] satisfies ExtensionScope[]

type ExtensionAuthModuleOptions = {
  clock?: () => Date
  createId?: () => string
  createToken?: () => ExtensionTokenMaterial
  google: GoogleIdentityVerifier
  repository: ExtensionSessionsRepository
  sessionTtlMs?: number
}

function toPublicSession(session: ActiveExtensionSession): ExtensionSession {
  return {
    expiresAt: session.expiresAt.toISOString(),
    id: session.id,
    scopes: session.scopes,
    user: session.user,
  }
}

export function createExtensionAuthModule(
  options: ExtensionAuthModuleOptions,
): ExtensionAuthModule {
  const clock = options.clock ?? (() => new Date())
  const createId = options.createId ?? randomUUID
  const createToken = options.createToken ?? createExtensionTokenMaterial
  const sessionTtlMs = options.sessionTtlMs ?? EXTENSION_SESSION_TTL_MS

  return {
    authenticate: async (token) => {
      if (!isExtensionToken(token)) {
        return null
      }

      const now = clock()
      const session = await options.repository.findActiveByTokenHash(
        hashExtensionToken(token),
        now,
      )
      if (!session) {
        return null
      }

      const staleBefore = new Date(now.getTime() - LAST_USED_WRITE_INTERVAL_MS)
      if (session.lastUsedAt < staleBefore) {
        await options.repository.touchLastUsed(session.id, now, staleBefore)
      }

      return toPublicSession(session)
    },

    exchangeGoogleAccessToken: async (accessToken) => {
      const identity = await options.google.verify(accessToken)
      const existingUser = await options.repository.findExistingGoogleUser(
        identity.subject,
      )

      if (
        !existingUser ||
        existingUser.email.toLowerCase() !== identity.email.toLowerCase()
      ) {
        throw new ExtensionAuthError(
          'ACCOUNT_NOT_CONNECTED',
          'This Google account is not connected to Cerebero.',
        )
      }

      const now = clock()
      const material = createToken()
      const created = await options.repository.create({
        createdAt: now,
        expiresAt: new Date(now.getTime() + sessionTtlMs),
        id: toExtensionSessionId(createId()),
        lastUsedAt: now,
        revokedAt: null,
        scopes: [...EXTENSION_CAPTURE_SCOPES],
        tokenHash: material.tokenHash,
        userId: existingUser.id,
      })

      const response: ExtensionGoogleAuthResponse = {
        session: toPublicSession(created),
        token: material.token,
      }
      return response
    },

    logout: async (token) => {
      if (!isExtensionToken(token)) {
        return
      }

      await options.repository.revokeByTokenHash(
        hashExtensionToken(token),
        clock(),
      )
    },
  }
}
