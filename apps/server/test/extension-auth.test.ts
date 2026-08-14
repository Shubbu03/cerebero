import { describe, expect, it, vi } from 'vitest'

import { createExtensionAuthModule } from '../src/modules/extension-auth/extension-auth.js'
import type {
  ActiveExtensionSession,
  ExtensionSessionRecord,
  ExtensionSessionsRepository,
} from '../src/modules/extension-auth/extension-auth-types.js'
import { toUserId } from '../src/modules/items/item-types.js'
import { createExtensionTokenMaterial } from '../src/modules/extension-auth/token.js'

const NOW = new Date('2026-08-13T12:00:00.000Z')
const SESSION_ID = '00000000-0000-4000-8000-000000000101'
const USER = {
  email: 'person@example.com',
  emailVerified: true,
  googleSubject: 'google-subject-1',
  id: toUserId('user-1'),
  image: null,
  name: 'Person',
}

function createRepository() {
  let active: ActiveExtensionSession | null = null
  const create = vi.fn((record: ExtensionSessionRecord) => {
    const created: ActiveExtensionSession = { ...record, user: USER }
    active = created
    return Promise.resolve(created)
  })
  const findActiveByTokenHash = vi.fn((tokenHash: string) =>
    Promise.resolve(active?.tokenHash === tokenHash ? active : null),
  )
  const findExistingGoogleUser = vi.fn((subject: string) =>
    Promise.resolve(subject === USER.googleSubject ? USER : null),
  )
  const revokeByTokenHash = vi.fn((tokenHash: string, revokedAt: Date) => {
    const current = active
    if (!current || current.tokenHash !== tokenHash) {
      return Promise.resolve(false)
    }

    active = { ...current, revokedAt }
    return Promise.resolve(true)
  })
  const repository: ExtensionSessionsRepository = {
    create,
    findActiveByTokenHash,
    findExistingGoogleUser,
    revokeByTokenHash,
    touchLastUsed: vi.fn().mockResolvedValue(undefined),
  }
  return { create, repository, revokeByTokenHash }
}

describe('Extension authentication module', () => {
  it('exchanges a verified existing Google account for a scoped opaque session', async () => {
    const { create, repository } = createRepository()
    const tokenMaterial = createExtensionTokenMaterial(() =>
      Buffer.alloc(32, 5),
    )
    const extensionAuth = createExtensionAuthModule({
      clock: () => NOW,
      createId: () => SESSION_ID,
      createToken: () => tokenMaterial,
      google: {
        verify: vi.fn().mockResolvedValue({
          email: USER.email,
          subject: USER.googleSubject,
        }),
      },
      repository,
    })

    const response = await extensionAuth.exchangeGoogleAccessToken(
      'google-access-token',
    )

    expect(response).toMatchObject({
      session: {
        id: SESSION_ID,
        scopes: ['items:create', 'items:duplicates:check'],
        user: { id: USER.id },
      },
      token: tokenMaterial.token,
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: tokenMaterial.tokenHash,
        userId: USER.id,
      }),
    )
    expect(JSON.stringify(create.mock.calls)).not.toContain(tokenMaterial.token)
    await expect(
      extensionAuth.authenticate(tokenMaterial.token),
    ).resolves.toMatchObject({
      id: SESSION_ID,
      user: { id: USER.id },
    })
  })

  it('does not create a new Cerebero account for an unknown Google identity', async () => {
    const { create, repository } = createRepository()
    const extensionAuth = createExtensionAuthModule({
      google: {
        verify: vi.fn().mockResolvedValue({
          email: 'unknown@example.com',
          subject: 'unknown-subject',
        }),
      },
      repository,
    })

    await expect(
      extensionAuth.exchangeGoogleAccessToken('google-access-token'),
    ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_CONNECTED' })
    expect(create).not.toHaveBeenCalled()
  })

  it('revokes the server-side session on logout', async () => {
    const { repository, revokeByTokenHash } = createRepository()
    const tokenMaterial = createExtensionTokenMaterial(() =>
      Buffer.alloc(32, 9),
    )
    const extensionAuth = createExtensionAuthModule({
      clock: () => NOW,
      createId: () => SESSION_ID,
      createToken: () => tokenMaterial,
      google: {
        verify: vi.fn().mockResolvedValue({
          email: USER.email,
          subject: USER.googleSubject,
        }),
      },
      repository,
    })

    await extensionAuth.exchangeGoogleAccessToken('google-access-token')
    await extensionAuth.logout(tokenMaterial.token)

    expect(revokeByTokenHash).toHaveBeenCalledWith(tokenMaterial.tokenHash, NOW)
  })
})
