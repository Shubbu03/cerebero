import { describe, expect, it } from 'vitest'

import { createItemsModule } from '../src/modules/items/items.js'
import { toItemId, toUserId } from '../src/modules/items/item-types.js'
import { toTagId } from '../src/modules/tags/tag-types.js'
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
    expect(note.enrichment).toBeNull()
    expect(link.item.enrichment).toMatchObject({
      attemptCount: 0,
      state: 'pending',
    })
  })

  it('uses extracted metadata only when authored and note titles are absent', async () => {
    const { items, repository } = createTestModule()
    const result = await items.capture(USER_A, {
      originalUrl: 'https://example.com/article',
    })
    if (result.outcome !== 'created') {
      throw new Error('Expected the link Capture to succeed.')
    }

    const record = repository.records.get(toItemId(result.item.id))
    if (!record?.enrichment) {
      throw new Error('Expected an enrichment record.')
    }
    record.enrichment.extractedTitle = `Extracted article title ${'x'.repeat(400)}`

    const item = await items.get(USER_A, record.id)
    expect(item?.displayTitle.startsWith('Extracted article title')).toBe(true)
    expect(item?.displayTitle).toHaveLength(300)
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
      tags: [],
    })
    expect(item).not.toHaveProperty('ownerId')
    expect(item).not.toHaveProperty('normalizedUrl')
  })

  it('includes Tags in Item projections when the record carries them', async () => {
    const { items, repository } = createTestModule()
    const item = await captureNote(items)
    const itemId = toItemId(item.id)
    const record = repository.records.get(itemId)
    if (!record) {
      throw new Error('Expected a stored Item record.')
    }

    record.tags = [
      {
        createdAt: new Date(Date.UTC(2026, 7, 7, 12, 0, 0)),
        id: toTagId('00000000-0000-4000-8000-000000000101'),
        name: 'zeta',
      },
      {
        createdAt: new Date(Date.UTC(2026, 7, 7, 11, 0, 0)),
        id: toTagId('00000000-0000-4000-8000-000000000102'),
        name: 'Alpha',
      },
    ]

    await expect(items.get(USER_A, itemId)).resolves.toMatchObject({
      tags: [
        { name: 'Alpha' },
        { name: 'zeta' },
      ],
    })
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

  it('enforces lifecycle, pin, archive, trash, restore, and permanent delete', async () => {
    const { items, repository } = createTestModule()
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

    const archived = await items.act(USER_A, itemId, {
      expectedVersion: 3,
      type: 'archive',
    })
    expect(archived).toMatchObject({
      pinnedAt: null,
      status: 'archived',
      trashedAt: null,
      version: 4,
    })

    const restoredFromArchive = await items.act(USER_A, itemId, {
      expectedVersion: 4,
      type: 'restore',
    })
    expect(restoredFromArchive).toMatchObject({
      status: 'library',
      version: 5,
    })

    const trashed = await items.act(USER_A, itemId, {
      expectedVersion: 5,
      type: 'trash',
    })
    expect(trashed).toMatchObject({
      pinnedAt: null,
      status: 'trashed',
      version: 6,
    })
    expect(trashed.trashedAt).toBeTruthy()

    await expect(
      items.act(USER_A, itemId, {
        expectedVersion: 6,
        type: 'pin',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ITEM_STATE' })

    const restoredFromTrash = await items.act(USER_A, itemId, {
      expectedVersion: 6,
      type: 'restore',
    })
    expect(restoredFromTrash).toMatchObject({
      pinnedAt: null,
      status: 'library',
      trashedAt: null,
      version: 7,
    })

    const trashedAgain = await items.act(USER_A, itemId, {
      expectedVersion: 7,
      type: 'trash',
    })
    await items.act(USER_A, itemId, {
      confirm: true,
      expectedVersion: trashedAgain.version,
      type: 'delete_permanently',
    })
    expect(repository.records.has(itemId)).toBe(false)
    await expect(items.get(USER_A, itemId)).resolves.toBeNull()
  })

  it('rejects permanent delete outside Trash and ownership boundaries', async () => {
    const { items } = createTestModule()
    const item = await captureNote(items)
    const itemId = toItemId(item.id)

    await expect(
      items.act(USER_A, itemId, {
        confirm: true,
        expectedVersion: 1,
        type: 'delete_permanently',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ITEM_STATE' })

    await items.act(USER_A, itemId, { expectedVersion: 1, type: 'trash' })
    await expect(
      items.act(USER_B, itemId, {
        confirm: true,
        expectedVersion: 2,
        type: 'delete_permanently',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('lists archived and trashed Items within the ownership boundary', async () => {
    const { items } = createTestModule()
    const first = await captureNote(items, USER_A)
    const second = await captureNote(items, USER_A)
    await captureNote(items, USER_B)

    await items.act(USER_A, toItemId(first.id), {
      expectedVersion: 1,
      type: 'archive',
    })
    await items.act(USER_A, toItemId(second.id), {
      expectedVersion: 1,
      type: 'trash',
    })

    const archived = await items.list(USER_A, {
      limit: 25,
      status: 'archived',
    })
    expect(archived.items.map((item) => item.id)).toEqual([first.id])

    const trashed = await items.list(USER_A, {
      limit: 25,
      status: 'trashed',
    })
    expect(trashed.items).toHaveLength(1)
    expect(trashed.items[0]).toMatchObject({
      id: second.id,
      status: 'trashed',
    })
    expect(trashed.items[0]?.trashedAt).toBeTruthy()
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

  it('filters Library lists by kind, pin state, and Tags', async () => {
    const { items, repository } = createTestModule()
    const note = await captureNote(items)
    const link = await items.capture(USER_A, {
      originalUrl: 'https://example.com/article',
    })
    if (link.outcome !== 'created') {
      throw new Error('Expected link Capture to succeed.')
    }

    await items.act(USER_A, toItemId(note.id), {
      expectedVersion: 1,
      type: 'file',
    })
    await items.act(USER_A, toItemId(link.item.id), {
      expectedVersion: 1,
      type: 'file',
    })
    await items.act(USER_A, toItemId(link.item.id), {
      expectedVersion: 2,
      type: 'pin',
    })

    const tagId = toTagId('00000000-0000-4000-8000-000000000201')
    const noteRecord = repository.records.get(toItemId(note.id))
    if (!noteRecord) {
      throw new Error('Expected note record.')
    }
    noteRecord.tags = [
      {
        createdAt: new Date(Date.UTC(2026, 7, 7, 12, 0, 0)),
        id: tagId,
        name: 'Research',
      },
    ]

    const notes = await items.list(USER_A, {
      kind: 'note',
      limit: 25,
      status: 'library',
    })
    expect(notes.items.map((item) => item.id)).toEqual([note.id])

    const pinned = await items.list(USER_A, {
      limit: 25,
      pinned: true,
      status: 'library',
    })
    expect(pinned.items.map((item) => item.id)).toEqual([link.item.id])

    const tagged = await items.list(USER_A, {
      limit: 25,
      status: 'library',
      tag: [tagId],
    })
    expect(tagged.items.map((item) => item.id)).toEqual([note.id])
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
