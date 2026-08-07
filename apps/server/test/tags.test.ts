import { describe, expect, it } from 'vitest'

import { MAX_TAGS_PER_ITEM } from '@cerebero/contracts'

import { toItemId, toUserId } from '../src/modules/items/item-types.js'
import { toTagId } from '../src/modules/tags/tag-types.js'
import { createTagsModule } from '../src/modules/tags/tags.js'
import { InMemoryTagsRepository } from './support/in-memory-tags-repository.js'

const USER_A = toUserId('user-a')
const USER_B = toUserId('user-b')
const ITEM_A = toItemId('00000000-0000-4000-8000-0000000000a1')
const ITEM_B = toItemId('00000000-0000-4000-8000-0000000000b1')
const TAG_IDS = [
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103',
]

function createTestModule() {
  const repository = new InMemoryTagsRepository()
  repository.seedItem(USER_A, ITEM_A)
  repository.seedItem(USER_B, ITEM_B)
  let idIndex = 0
  const tags = createTagsModule({
    clock: () => new Date(Date.UTC(2026, 7, 7, 12, 0, 0)),
    createId: () => TAG_IDS[idIndex++] ?? crypto.randomUUID(),
    repository,
  })

  return { repository, tags }
}

describe('Tags module', () => {
  it('creates Tags with display casing and case-insensitive uniqueness', async () => {
    const { repository, tags } = createTestModule()
    const created = await tags.create(USER_A, { name: '  Research  ' })

    expect(created).toMatchObject({
      id: TAG_IDS[0],
      name: 'Research',
    })
    expect(created).not.toHaveProperty('ownerId')
    expect(created).not.toHaveProperty('normalizedName')
    expect(repository.records.get(toTagId(created.id))?.normalizedName).toBe(
      'research',
    )

    await expect(tags.create(USER_A, { name: 'research' })).rejects.toMatchObject(
      { code: 'DUPLICATE_TAG' },
    )
    await expect(tags.create(USER_B, { name: 'Research' })).resolves.toMatchObject(
      { name: 'Research' },
    )
  })

  it('lists only the actor Tags sorted by name', async () => {
    const { tags } = createTestModule()
    await tags.create(USER_A, { name: 'zeta' })
    await tags.create(USER_B, { name: 'beta' })
    await tags.create(USER_A, { name: 'Alpha' })

    await expect(tags.list(USER_A)).resolves.toEqual({
      tags: [
        expect.objectContaining({ name: 'Alpha' }),
        expect.objectContaining({ name: 'zeta' }),
      ],
    })
  })

  it('renames Tags while preserving uniqueness and ownership', async () => {
    const { tags } = createTestModule()
    const first = await tags.create(USER_A, { name: 'Draft' })
    const second = await tags.create(USER_A, { name: 'Later' })

    const renamed = await tags.rename(USER_A, toTagId(first.id), {
      name: 'Shipping',
    })
    expect(renamed.name).toBe('Shipping')

    await expect(
      tags.rename(USER_A, toTagId(second.id), { name: 'shipping' }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_TAG' })

    await expect(
      tags.rename(USER_B, toTagId(first.id), { name: 'Stolen' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('deletes Tags and their relationships without deleting Items', async () => {
    const { repository, tags } = createTestModule()
    const tag = await tags.create(USER_A, { name: 'Temporary' })
    await tags.attach(USER_A, ITEM_A, toTagId(tag.id))
    expect(repository.attachments.size).toBe(1)

    await tags.delete(USER_A, toTagId(tag.id))
    expect(repository.records.has(toTagId(tag.id))).toBe(false)
    expect(repository.attachments.size).toBe(0)
    expect(repository.items.has(ITEM_A)).toBe(true)

    await expect(tags.delete(USER_A, toTagId(tag.id))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('attaches and detaches Tags only inside the ownership boundary', async () => {
    const { tags } = createTestModule()
    const ownedTag = await tags.create(USER_A, { name: 'Owned' })
    const foreignTag = await tags.create(USER_B, { name: 'Foreign' })

    const attached = await tags.attach(USER_A, ITEM_A, toTagId(ownedTag.id))
    expect(attached).toEqual([
      expect.objectContaining({ id: ownedTag.id, name: 'Owned' }),
    ])

    // Idempotent re-attach.
    await expect(
      tags.attach(USER_A, ITEM_A, toTagId(ownedTag.id)),
    ).resolves.toHaveLength(1)

    await expect(
      tags.attach(USER_A, ITEM_A, toTagId(foreignTag.id)),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      tags.attach(USER_A, ITEM_B, toTagId(ownedTag.id)),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      tags.attach(USER_B, ITEM_A, toTagId(ownedTag.id)),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    const detached = await tags.detach(USER_A, ITEM_A, toTagId(ownedTag.id))
    expect(detached).toEqual([])
  })

  it('rejects empty names and enforces the per-Item Tag cap', async () => {
    const { repository, tags } = createTestModule()

    await expect(tags.create(USER_A, { name: '   ' })).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    })

    const createdTags = []
    for (let index = 0; index < MAX_TAGS_PER_ITEM; index += 1) {
      const tag = await tags.create(USER_A, { name: `Tag ${index}` })
      createdTags.push(tag)
      await tags.attach(USER_A, ITEM_A, toTagId(tag.id))
    }

    const overflow = await tags.create(USER_A, { name: 'Overflow' })
    await expect(
      tags.attach(USER_A, ITEM_A, toTagId(overflow.id)),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    expect(repository.attachments.size).toBe(MAX_TAGS_PER_ITEM)
    expect(createdTags).toHaveLength(MAX_TAGS_PER_ITEM)
  })

  it('keeps concurrent same-name creates as a single winner', async () => {
    const repository = new InMemoryTagsRepository()
    const tags = createTagsModule({
      createId: () => crypto.randomUUID(),
      repository,
    })

    const results = await Promise.allSettled([
      tags.create(USER_A, { name: 'Concurrent' }),
      tags.create(USER_A, { name: 'concurrent' }),
      tags.create(USER_A, { name: 'CONCURRENT' }),
    ])

    const fulfilled = results.filter((result) => result.status === 'fulfilled')
    const rejected = results.filter((result) => result.status === 'rejected')

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(2)
    expect(rejected.every((result) => result.status === 'rejected')).toBe(true)
    for (const result of rejected) {
      if (result.status === 'rejected') {
        expect(result.reason).toMatchObject({ code: 'DUPLICATE_TAG' })
      }
    }
    expect(repository.records.size).toBe(1)
  })
})
