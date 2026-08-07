import { describe, expect, it } from 'vitest'

import { toItemId, toUserId } from '../src/modules/items/item-types.js'
import { toTagId } from '../src/modules/tags/tag-types.js'
import { InMemoryTagsRepository } from './support/in-memory-tags-repository.js'

const USER_A = toUserId('user-a')
const USER_B = toUserId('user-b')
const ITEM_A = toItemId('00000000-0000-4000-8000-0000000000a1')
const ITEM_B = toItemId('00000000-0000-4000-8000-0000000000b1')
const TAG_A = toTagId('00000000-0000-4000-8000-000000000101')
const TAG_B = toTagId('00000000-0000-4000-8000-000000000102')

function seedRepository() {
  const repository = new InMemoryTagsRepository()
  repository.seedItem(USER_A, ITEM_A)
  repository.seedItem(USER_B, ITEM_B)
  return repository
}

describe('Tags repository (in-memory)', () => {
  it('enforces owner-scoped uniqueness on create and rename', async () => {
    const repository = seedRepository()
    await repository.create({
      createdAt: new Date('2026-08-07T12:00:00.000Z'),
      id: TAG_A,
      name: 'Research',
      normalizedName: 'research',
      ownerId: USER_A,
    })

    await expect(
      repository.create({
        createdAt: new Date('2026-08-07T12:01:00.000Z'),
        id: TAG_B,
        name: 'research',
        normalizedName: 'research',
        ownerId: USER_A,
      }),
    ).rejects.toThrow('DUPLICATE_TAG')

    await expect(
      repository.create({
        createdAt: new Date('2026-08-07T12:01:00.000Z'),
        id: TAG_B,
        name: 'Research',
        normalizedName: 'research',
        ownerId: USER_B,
      }),
    ).resolves.toMatchObject({ ownerId: USER_B })
  })

  it('refuses cross-tenant attach and delete operations', async () => {
    const repository = seedRepository()
    await repository.create({
      createdAt: new Date('2026-08-07T12:00:00.000Z'),
      id: TAG_A,
      name: 'Research',
      normalizedName: 'research',
      ownerId: USER_A,
    })

    await expect(
      repository.attach(USER_B, ITEM_A, TAG_A, new Date()),
    ).resolves.toBeNull()
    await expect(
      repository.attach(USER_A, ITEM_B, TAG_A, new Date()),
    ).resolves.toBeNull()
    await expect(repository.delete(USER_B, TAG_A)).resolves.toBe(false)
    await expect(repository.findById(USER_B, TAG_A)).resolves.toBeNull()
  })

  it('treats concurrent attach races as already attached', async () => {
    const repository = seedRepository()
    await repository.create({
      createdAt: new Date('2026-08-07T12:00:00.000Z'),
      id: TAG_A,
      name: 'Research',
      normalizedName: 'research',
      ownerId: USER_A,
    })

    const results = await Promise.all([
      repository.attach(
        USER_A,
        ITEM_A,
        TAG_A,
        new Date('2026-08-07T12:00:00.000Z'),
      ),
      repository.attach(
        USER_A,
        ITEM_A,
        TAG_A,
        new Date('2026-08-07T12:00:01.000Z'),
      ),
    ])

    expect(results.filter((result) => result === 'attached')).toHaveLength(1)
    expect(
      results.filter((result) => result === 'already_attached'),
    ).toHaveLength(1)
    expect(repository.attachments.size).toBe(1)
  })
})
