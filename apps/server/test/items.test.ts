import { describe, expect, it } from 'vitest'

import { createItemsModule } from '../src/modules/items/items.js'
import { toItemId, toUserId } from '../src/modules/items/item-types.js'
import { InMemoryItemsRepository } from './support/in-memory-items-repository.js'

const USER_A = toUserId('user-a')
const USER_B = toUserId('user-b')
const ITEM_IDS = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
]

function createTestModule() {
  const repository = new InMemoryItemsRepository()
  let clockTick = 0
  let idIndex = 0
  const items = createItemsModule({
    clock: () => new Date(Date.UTC(2026, 7, 6, 9, clockTick++)),
    createId: () => ITEM_IDS[idIndex++] ?? crypto.randomUUID(),
    repository,
  })

  return { items, repository }
}

async function captureNote(
  items: ReturnType<typeof createItemsModule>,
  actor = USER_A,
) {
  const result = await items.capture(actor, { noteMarkdown: '# First line' })
  if (result.outcome !== 'created') {
    throw new Error('Expected the note Capture to succeed.')
  }
  return result.item
}

describe('Items module', () => {
  it('normalizes duplicate URLs conservatively and scopes candidates per User', async () => {
    const { items, repository } = createTestModule()
    const first = await items.capture(USER_A, {
      originalUrl: 'HTTP://Example.COM:80/path?keep=yes#remove-me',
    })
    expect(first.outcome).toBe('created')

    const stored = [...repository.records.values()][0]
    expect(stored?.originalUrl).toBe(
      'HTTP://Example.COM:80/path?keep=yes#remove-me',
    )
    expect(stored?.normalizedUrl).toBe('http://example.com/path?keep=yes')

    const duplicate = await items.capture(USER_A, {
      originalUrl: 'http://example.com/path?keep=yes#another-fragment',
    })
    expect(duplicate).toMatchObject({ outcome: 'duplicate' })
    if (duplicate.outcome === 'duplicate') {
      expect(duplicate.candidates).toHaveLength(1)
    }

    await expect(
      items.findDuplicateLinks(
        USER_B,
        'http://example.com/path?keep=yes#private',
      ),
    ).resolves.toEqual([])

    await expect(
      items.capture(USER_B, {
        originalUrl: 'http://example.com/path?keep=yes',
      }),
    ).resolves.toMatchObject({ outcome: 'created' })
  })

  it('creates deliberate duplicate Captures as distinct Items', async () => {
    const { items } = createTestModule()
    await items.capture(USER_A, { originalUrl: 'https://example.com/path' })
    const duplicate = await items.capture(USER_A, {
      allowDuplicate: true,
      originalUrl: 'https://example.com/path#ignored',
    })

    expect(duplicate).toMatchObject({ outcome: 'created' })
    if (duplicate.outcome === 'created') {
      expect(duplicate.item.version).toBe(1)
    }
  })

  it('schedules enrichment only for link Captures', async () => {
    const { items, repository } = createTestModule()
    const note = await captureNote(items)
    const link = await items.capture(USER_A, {
      originalUrl: 'https://example.com/link',
    })
    if (link.outcome !== 'created') {
      throw new Error('Expected the link Capture to succeed.')
    }

    expect(repository.enrichmentItemIds.has(toItemId(note.id))).toBe(false)
    expect(repository.jobItemIds.has(toItemId(note.id))).toBe(false)
    expect(repository.enrichmentItemIds.has(toItemId(link.item.id))).toBe(true)
    expect(repository.jobItemIds.has(toItemId(link.item.id))).toBe(true)
  })

  it('atomically resets or removes enrichment work when a URL changes', async () => {
    const { items, repository } = createTestModule()
    const note = await captureNote(items)
    const itemId = toItemId(note.id)

    const linked = await items.update(USER_A, itemId, {
      expectedVersion: 1,
      originalUrl: 'https://example.com/added',
    })
    expect(repository.enrichmentItemIds.has(itemId)).toBe(true)
    expect(repository.jobItemIds.has(itemId)).toBe(true)

    await items.update(USER_A, itemId, {
      expectedVersion: linked.version,
      originalUrl: null,
    })
    expect(repository.enrichmentItemIds.has(itemId)).toBe(false)
    expect(repository.jobItemIds.has(itemId)).toBe(false)
  })

  it('derives note display titles without exposing internal ownership fields', async () => {
    const { items } = createTestModule()
    const item = await captureNote(items)

    expect(item).toMatchObject({
      displayTitle: '# First line',
      kind: 'note',
      status: 'inbox',
    })
    expect(item).not.toHaveProperty('ownerId')
    expect(item).not.toHaveProperty('normalizedUrl')
  })

  it('enforces ownership as not-found across reads and writes', async () => {
    const { items } = createTestModule()
    const item = await captureNote(items)
    const itemId = toItemId(item.id)

    await expect(items.get(USER_B, itemId)).resolves.toBeNull()
    await expect(
      items.update(USER_B, itemId, {
        authoredTitle: 'Stolen',
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      items.act(USER_B, itemId, { expectedVersion: 1, type: 'file' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('uses optimistic versions to preserve concurrent edits', async () => {
    const { items } = createTestModule()
    const item = await captureNote(items)
    const itemId = toItemId(item.id)

    const edited = await items.update(USER_A, itemId, {
      authoredTitle: 'Authored title',
      expectedVersion: 1,
      noteMarkdown: '# Updated note',
    })
    expect(edited).toMatchObject({
      authoredTitle: 'Authored title',
      noteMarkdown: '# Updated note',
      version: 2,
    })

    await expect(
      items.update(USER_A, itemId, {
        authoredTitle: 'Stale overwrite',
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'EDIT_CONFLICT' })

    await expect(items.get(USER_A, itemId)).resolves.toMatchObject({
      authoredTitle: 'Authored title',
      version: 2,
    })
  })

  it('rejects edits that would remove all Item content', async () => {
    const { items } = createTestModule()
    const item = await captureNote(items)

    await expect(
      items.update(USER_A, toItemId(item.id), {
        expectedVersion: 1,
        noteMarkdown: null,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
  })

  it('enforces Phase 2 lifecycle and pin transitions', async () => {
    const { items } = createTestModule()
    const captured = await captureNote(items)
    const itemId = toItemId(captured.id)

    const filed = await items.act(USER_A, itemId, {
      expectedVersion: 1,
      type: 'file',
    })
    expect(filed).toMatchObject({ status: 'library', version: 2 })

    const pinned = await items.act(USER_A, itemId, {
      expectedVersion: 2,
      type: 'pin',
    })
    expect(pinned.pinnedAt).toBeTruthy()

    const moved = await items.act(USER_A, itemId, {
      expectedVersion: 3,
      type: 'move_to_inbox',
    })
    expect(moved).toMatchObject({ status: 'inbox', version: 4 })

    const unpinned = await items.act(USER_A, itemId, {
      expectedVersion: 4,
      type: 'unpin',
    })
    expect(unpinned).toMatchObject({ pinnedAt: null, version: 5 })

    await expect(
      items.act(USER_A, itemId, {
        expectedVersion: 5,
        type: 'unpin',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_ITEM_STATE',
    })
  })

  it('paginates newest-first without including another User records', async () => {
    const { items } = createTestModule()
    await captureNote(items, USER_A)
    await captureNote(items, USER_B)
    await captureNote(items, USER_A)

    const firstPage = await items.list(USER_A, {
      limit: 1,
      status: 'inbox',
    })
    expect(firstPage.items).toHaveLength(1)
    expect(firstPage.nextCursor).toBeTruthy()

    const secondPage = await items.list(USER_A, {
      cursor: firstPage.nextCursor ?? undefined,
      limit: 1,
      status: 'inbox',
    })
    expect(secondPage.items).toHaveLength(1)
    expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id)
    expect(secondPage.nextCursor).toBeNull()
  })

  it('rejects malformed and cross-status cursors', async () => {
    const { items } = createTestModule()
    await expect(
      items.list(USER_A, {
        cursor: 'not-a-valid-cursor',
        limit: 25,
        status: 'inbox',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
  })
})
