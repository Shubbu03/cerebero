import { randomUUID } from 'node:crypto'

import { MAX_TAG_NAME_LENGTH, MAX_TAGS_PER_ITEM } from '@cerebero/contracts'
import type { CreateTagInput, RenameTagInput, TagView } from '@cerebero/contracts'

import type { ItemId, UserId } from '../items/item-types.js'
import type {
  TagId,
  TagRecord,
  TagSummary,
  TagRepository,
  TagsModule,
} from './tag-types.js'
import { TagsError, toTagId } from './tag-types.js'

type TagsModuleOptions = {
  clock?: () => Date
  createId?: () => string
  repository: TagRepository
}

function normalizeTagName(value: string): { name: string; normalizedName: string } {
  const name = value.trim()
  if (name.length === 0) {
    throw new TagsError('INVALID_REQUEST', 'A Tag name is required.')
  }

  if (name.length > MAX_TAG_NAME_LENGTH) {
    throw new TagsError(
      'INVALID_REQUEST',
      `Tag names must be at most ${MAX_TAG_NAME_LENGTH} characters.`,
    )
  }

  return {
    name,
    // Must stay compatible with PostgreSQL lower(btrim(name)) on tags.
    normalizedName: name.toLowerCase(),
  }
}

function toTagView(record: TagRecord | TagSummary): TagView {
  return {
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    name: record.name,
  }
}

function sortTagViews(tags: TagView[]): TagView[] {
  return [...tags].sort(
    (left, right) =>
      left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }) ||
      left.id.localeCompare(right.id),
  )
}

export function createTagsModule(options: TagsModuleOptions): TagsModule {
  const clock = options.clock ?? (() => new Date())
  const createId = options.createId ?? randomUUID

  async function getOwnedTag(actor: UserId, tagId: TagId): Promise<TagRecord> {
    const record = await options.repository.findById(actor, tagId)
    if (!record) {
      throw new TagsError('NOT_FOUND', 'The requested Tag was not found.')
    }

    return record
  }

  async function requireOwnedItem(actor: UserId, itemId: ItemId): Promise<void> {
    const item = await options.repository.findItemRef(actor, itemId)
    if (!item) {
      throw new TagsError('NOT_FOUND', 'The requested Item was not found.')
    }
  }

  async function tagsForItem(actor: UserId, itemId: ItemId): Promise<TagView[]> {
    const tags = await options.repository.listForItem(actor, itemId)
    return sortTagViews(tags.map(toTagView))
  }

  return {
    attach: async (actor, itemId, tagId) => {
      await requireOwnedItem(actor, itemId)
      await getOwnedTag(actor, tagId)

      const existingCount = await options.repository.countItemTags(actor, itemId)
      const alreadyAttached = (await options.repository.listForItem(actor, itemId)).some(
        (tag) => tag.id === tagId,
      )
      if (!alreadyAttached && existingCount >= MAX_TAGS_PER_ITEM) {
        throw new TagsError(
          'INVALID_REQUEST',
          `An Item may have at most ${MAX_TAGS_PER_ITEM} Tags.`,
        )
      }

      const result = await options.repository.attach(
        actor,
        itemId,
        tagId,
        clock(),
      )
      if (result === null) {
        // Ownership recheck lost the race or resources vanished.
        throw new TagsError('NOT_FOUND', 'The requested Tag was not found.')
      }

      return tagsForItem(actor, itemId)
    },

    create: async (actor, input: CreateTagInput) => {
      const { name, normalizedName } = normalizeTagName(input.name)
      const existing = await options.repository.findByNormalizedName(
        actor,
        normalizedName,
      )
      if (existing) {
        throw new TagsError(
          'DUPLICATE_TAG',
          'A Tag with this name already exists.',
        )
      }

      try {
        const created = await options.repository.create({
          createdAt: clock(),
          id: toTagId(createId()),
          name,
          normalizedName,
          ownerId: actor,
        })
        return toTagView(created)
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'DUPLICATE_TAG'
        ) {
          throw new TagsError(
            'DUPLICATE_TAG',
            'A Tag with this name already exists.',
          )
        }

        throw error
      }
    },

    delete: async (actor, tagId) => {
      const deleted = await options.repository.delete(actor, tagId)
      if (!deleted) {
        throw new TagsError('NOT_FOUND', 'The requested Tag was not found.')
      }
    },

    detach: async (actor, itemId, tagId) => {
      await requireOwnedItem(actor, itemId)
      await getOwnedTag(actor, tagId)

      await options.repository.detach(actor, itemId, tagId)
      return tagsForItem(actor, itemId)
    },

    get: async (actor, tagId) => {
      const record = await options.repository.findById(actor, tagId)
      return record ? toTagView(record) : null
    },

    list: async (actor) => {
      const records = await options.repository.list(actor)
      return {
        tags: sortTagViews(records.map(toTagView)),
      }
    },

    rename: async (actor, tagId, input: RenameTagInput) => {
      await getOwnedTag(actor, tagId)
      const { name, normalizedName } = normalizeTagName(input.name)

      const conflict = await options.repository.findByNormalizedName(
        actor,
        normalizedName,
      )
      if (conflict && conflict.id !== tagId) {
        throw new TagsError(
          'DUPLICATE_TAG',
          'A Tag with this name already exists.',
        )
      }

      try {
        const renamed = await options.repository.rename(
          actor,
          tagId,
          name,
          normalizedName,
        )
        if (!renamed) {
          throw new TagsError('NOT_FOUND', 'The requested Tag was not found.')
        }

        return toTagView(renamed)
      } catch (error) {
        if (error instanceof TagsError) {
          throw error
        }
        if (error instanceof Error && error.message === 'DUPLICATE_TAG') {
          throw new TagsError(
            'DUPLICATE_TAG',
            'A Tag with this name already exists.',
          )
        }

        throw error
      }
    },
  }
}
