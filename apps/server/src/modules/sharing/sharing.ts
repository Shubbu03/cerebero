import { randomUUID } from 'node:crypto'

import type {
  PublicSharedItem,
  ShareLinkCreated,
  ShareLinkStatus,
} from '@cerebero/contracts'

import type { ItemId, UserId } from '../items/item-types.js'
import type {
  ShareableItemSnapshot,
  ShareLinksRepository,
  SharingModule,
} from './share-types.js'
import { SharingError, toShareLinkId } from './share-types.js'
import { createShareTokenMaterial, hashShareToken } from './token.js'

type SharingModuleOptions = {
  clock?: () => Date
  createId?: () => string
  createToken?: () => { token: string; tokenHash: string }
  repository: ShareLinksRepository
}

function assertShareable(item: ShareableItemSnapshot): void {
  if (item.status !== 'library') {
    throw new SharingError(
      'INVALID_ITEM_STATE',
      'Only Library Items can be shared.',
    )
  }
}

function displayTitle(item: ShareableItemSnapshot): string {
  if (item.authoredTitle) {
    return item.authoredTitle
  }

  if (item.noteMarkdown) {
    const firstLine = item.noteMarkdown
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean)
    if (firstLine) {
      return firstLine.slice(0, 300)
    }
  }

  if (item.originalUrl) {
    try {
      return new URL(item.originalUrl).hostname
    } catch {
      return 'Shared Item'
    }
  }

  return 'Untitled note'
}

function toPublicProjection(item: ShareableItemSnapshot): PublicSharedItem {
  return {
    authoredTitle: item.authoredTitle,
    displayTitle: displayTitle(item),
    kind: item.originalUrl ? 'link' : 'note',
    noteMarkdown: item.noteMarkdown,
    originalUrl: item.originalUrl,
  }
}

export function createSharingModule(
  options: SharingModuleOptions,
): SharingModule {
  const clock = options.clock ?? (() => new Date())
  const createId = options.createId ?? randomUUID
  const createToken = options.createToken ?? createShareTokenMaterial

  async function requireOwnedShareableItem(
    actor: UserId,
    itemId: ItemId,
  ): Promise<ShareableItemSnapshot> {
    const item = await options.repository.findShareableItem(actor, itemId)
    if (!item) {
      throw new SharingError('NOT_FOUND', 'The requested Item was not found.')
    }

    return item
  }

  return {
    create: async (actor, itemId) => {
      const item = await requireOwnedShareableItem(actor, itemId)
      assertShareable(item)

      const existing = await options.repository.findActiveByItem(actor, itemId)
      if (existing) {
        throw new SharingError(
          'INVALID_ITEM_STATE',
          'An active Share Link already exists for this Item.',
        )
      }

      const material = createToken()
      const now = clock()
      try {
        const created = await options.repository.createActive({
          createdAt: now,
          id: toShareLinkId(createId()),
          itemId,
          ownerId: actor,
          revokedAt: null,
          tokenHash: material.tokenHash,
        })

        const response: ShareLinkCreated = {
          createdAt: created.createdAt.toISOString(),
          itemId,
          token: material.token,
        }
        return response
      } catch (error) {
        if (error instanceof Error && error.message === 'ACTIVE_SHARE_EXISTS') {
          throw new SharingError(
            'INVALID_ITEM_STATE',
            'An active Share Link already exists for this Item.',
          )
        }

        throw error
      }
    },

    getStatus: async (actor, itemId) => {
      await requireOwnedShareableItem(actor, itemId)
      const active = await options.repository.findActiveByItem(actor, itemId)
      const status: ShareLinkStatus = {
        active: Boolean(active),
        createdAt: active?.createdAt.toISOString() ?? null,
      }
      return status
    },

    resolvePublic: async (token) => {
      if (!token || token.trim().length === 0) {
        return null
      }

      const tokenHash = hashShareToken(token)
      const share = await options.repository.findActiveByTokenHash(tokenHash)
      if (!share || share.revokedAt) {
        return null
      }

      const item = await options.repository.findShareableItemById(share.itemId)
      if (!item || item.status !== 'library') {
        return null
      }

      return toPublicProjection(item)
    },

    revoke: async (actor, itemId) => {
      await requireOwnedShareableItem(actor, itemId)
      const revoked = await options.repository.revokeActiveForItem(
        actor,
        itemId,
        clock(),
      )
      if (!revoked) {
        throw new SharingError(
          'NOT_FOUND',
          'No active Share Link exists for this Item.',
        )
      }
    },

    revokeForLifecycle: async (itemId) => {
      await options.repository.revokeAllActiveForItem(itemId, clock())
    },

    rotate: async (actor, itemId) => {
      const item = await requireOwnedShareableItem(actor, itemId)
      assertShareable(item)

      const material = createToken()
      const now = clock()
      const rotated = await options.repository.rotateActive(
        actor,
        itemId,
        {
          createdAt: now,
          id: toShareLinkId(createId()),
          itemId,
          ownerId: actor,
          revokedAt: null,
          tokenHash: material.tokenHash,
        },
        now,
      )

      if (!rotated) {
        throw new SharingError(
          'NOT_FOUND',
          'No active Share Link exists for this Item.',
        )
      }

      return {
        createdAt: rotated.createdAt.toISOString(),
        itemId,
        token: material.token,
      }
    },
  }
}
