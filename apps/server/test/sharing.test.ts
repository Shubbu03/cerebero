import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { createItemsModule } from '../src/modules/items/items.js'
import { toItemId, toUserId } from '../src/modules/items/item-types.js'
import { createSharingModule } from '../src/modules/sharing/sharing.js'
import { hashShareToken } from '../src/modules/sharing/token.js'
import { InMemoryItemsRepository } from './support/in-memory-items-repository.js'
import { InMemoryShareLinksRepository } from './support/in-memory-share-links-repository.js'

const USER_A = toUserId('user-a')
const USER_B = toUserId('user-b')
const ITEM_A = toItemId('00000000-0000-4000-8000-0000000000a1')
const ITEM_B = toItemId('00000000-0000-4000-8000-0000000000b1')
const SHARE_IDS = [
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000303',
]

function seedItem(
  repository: InMemoryShareLinksRepository,
  overrides: {
    id?: ReturnType<typeof toItemId>
    ownerId?: ReturnType<typeof toUserId>
    status?: 'library' | 'archived' | 'trashed'
    authoredTitle?: string | null
  } = {},
) {
  repository.seedItem({
    authoredTitle: overrides.authoredTitle ?? 'Shared note',
    id: overrides.id ?? ITEM_A,
    noteMarkdown: '# Body',
    originalUrl: null,
    ownerId: overrides.ownerId ?? USER_A,
    status: overrides.status ?? 'library',
  })
}

function createSharingTestModule() {
  const repository = new InMemoryShareLinksRepository()
  seedItem(repository)
  seedItem(repository, { id: ITEM_B, ownerId: USER_B })
  let idIndex = 0
  let tokenIndex = 0
  const tokens = [
    'token-alpha-000000000000000000000001',
    'token-beta-000000000000000000000002',
  ]
  const sharing = createSharingModule({
    clock: () => new Date('2026-08-08T10:00:00.000Z'),
    createId: () => SHARE_IDS[idIndex++] ?? crypto.randomUUID(),
    createToken: () => {
      const token = tokens[tokenIndex++] ?? `token-${tokenIndex}`
      return { token, tokenHash: hashShareToken(token) }
    },
    repository,
  })

  return { repository, sharing }
}

describe('Sharing module', () => {
  it('creates a Share Link with hashed token storage and one-active uniqueness', async () => {
    const { repository, sharing } = createSharingTestModule()
    const created = await sharing.create(USER_A, ITEM_A)

    expect(created).toMatchObject({
      itemId: ITEM_A,
      token: 'token-alpha-000000000000000000000001',
    })
    expect(created).not.toHaveProperty('tokenHash')
    expect(created).not.toHaveProperty('ownerId')

    const stored = repository.records[0]
    expect(stored?.tokenHash).toBe(
      createHash('sha256')
        .update('token-alpha-000000000000000000000001', 'utf8')
        .digest('hex'),
    )
    expect(stored?.tokenHash).not.toContain('token-alpha')

    await expect(sharing.create(USER_A, ITEM_A)).rejects.toMatchObject({
      code: 'INVALID_ITEM_STATE',
    })
  })

  it('rotates tokens so the old plaintext stops resolving', async () => {
    const { sharing } = createSharingTestModule()
    const created = await sharing.create(USER_A, ITEM_A)
    const rotated = await sharing.rotate(USER_A, ITEM_A)

    expect(rotated.token).not.toBe(created.token)
    await expect(sharing.resolvePublic(created.token)).resolves.toBeNull()
    await expect(sharing.resolvePublic(rotated.token)).resolves.toMatchObject({
      displayTitle: 'Shared note',
      kind: 'note',
      noteMarkdown: '# Body',
    })
  })

  it('returns a limited public projection without private fields', async () => {
    const { sharing } = createSharingTestModule()
    const created = await sharing.create(USER_A, ITEM_A)
    const publicItem = await sharing.resolvePublic(created.token)

    expect(publicItem).toEqual({
      authoredTitle: 'Shared note',
      displayTitle: 'Shared note',
      kind: 'note',
      noteMarkdown: '# Body',
      originalUrl: null,
    })
    expect(publicItem).not.toHaveProperty('ownerId')
    expect(publicItem).not.toHaveProperty('tags')
    expect(publicItem).not.toHaveProperty('version')
    expect(publicItem).not.toHaveProperty('status')
    expect(publicItem).not.toHaveProperty('id')
  })

  it('enforces owner scoping and shareable lifecycle states', async () => {
    const { repository, sharing } = createSharingTestModule()

    await expect(sharing.create(USER_B, ITEM_A)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })

    repository.seedItem({
      authoredTitle: 'Archived',
      id: toItemId('00000000-0000-4000-8000-0000000000c1'),
      noteMarkdown: 'x',
      originalUrl: null,
      ownerId: USER_A,
      status: 'archived',
    })

    await expect(
      sharing.create(USER_A, toItemId('00000000-0000-4000-8000-0000000000c1')),
    ).rejects.toMatchObject({ code: 'INVALID_ITEM_STATE' })
  })

  it('treats revoked, foreign, and unknown tokens as identical misses', async () => {
    const { sharing } = createSharingTestModule()
    const created = await sharing.create(USER_A, ITEM_A)
    await sharing.revoke(USER_A, ITEM_A)

    await expect(sharing.resolvePublic(created.token)).resolves.toBeNull()
    await expect(
      sharing.resolvePublic('missing-token-value-000000000001'),
    ).resolves.toBeNull()
    await expect(sharing.resolvePublic('')).resolves.toBeNull()
  })

  it('revokes Share Links on archive and trash transitions', async () => {
    const shareRepository = new InMemoryShareLinksRepository()
    const itemsRepository = new InMemoryItemsRepository()
    let tokenIndex = 0
    const sharing = createSharingModule({
      createToken: () => {
        const token = `lifecycle-token-${tokenIndex++}-00000000000001`
        return { token, tokenHash: hashShareToken(token) }
      },
      repository: shareRepository,
    })
    const items = createItemsModule({
      repository: itemsRepository,
      revokeShareLinks: (itemId) => sharing.revokeForLifecycle(itemId),
    })

    const captured = await items.capture(USER_A, {
      noteMarkdown: '# Share me',
    })
    if (captured.outcome !== 'created') {
      throw new Error('Expected capture to succeed.')
    }
    const itemId = toItemId(captured.item.id)
    shareRepository.seedItem({
      authoredTitle: null,
      id: itemId,
      noteMarkdown: '# Share me',
      originalUrl: null,
      ownerId: USER_A,
      status: 'library',
    })

    const created = await sharing.create(USER_A, itemId)
    await expect(sharing.resolvePublic(created.token)).resolves.not.toBeNull()

    await items.act(USER_A, itemId, { expectedVersion: 1, type: 'archive' })
    shareRepository.seedItem({
      authoredTitle: null,
      id: itemId,
      noteMarkdown: '# Share me',
      originalUrl: null,
      ownerId: USER_A,
      status: 'archived',
    })
    await expect(sharing.resolvePublic(created.token)).resolves.toBeNull()

    // Restore does not revive the old Share Link.
    await items.act(USER_A, itemId, { expectedVersion: 2, type: 'restore' })
    shareRepository.seedItem({
      authoredTitle: null,
      id: itemId,
      noteMarkdown: '# Share me',
      originalUrl: null,
      ownerId: USER_A,
      status: 'library',
    })
    await expect(sharing.resolvePublic(created.token)).resolves.toBeNull()

    const recreated = await sharing.create(USER_A, itemId)
    await items.act(USER_A, itemId, {
      expectedVersion: 3,
      type: 'trash',
    })
    shareRepository.seedItem({
      authoredTitle: null,
      id: itemId,
      noteMarkdown: '# Share me',
      originalUrl: null,
      ownerId: USER_A,
      status: 'trashed',
    })
    await expect(sharing.resolvePublic(recreated.token)).resolves.toBeNull()
  })

  it('keeps concurrent create races to a single active Share Link', async () => {
    const repository = new InMemoryShareLinksRepository()
    seedItem(repository)
    const sharing = createSharingModule({
      createId: () => crypto.randomUUID(),
      createToken: () => {
        const token = crypto.randomUUID().replaceAll('-', '')
        return { token, tokenHash: hashShareToken(token) }
      },
      repository,
    })

    const results = await Promise.allSettled([
      sharing.create(USER_A, ITEM_A),
      sharing.create(USER_A, ITEM_A),
      sharing.create(USER_A, ITEM_A),
    ])

    const fulfilled = results.filter((result) => result.status === 'fulfilled')
    const rejected = results.filter((result) => result.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(2)
    expect(
      repository.records.filter((record) => record.revokedAt === null),
    ).toHaveLength(1)
  })
})
