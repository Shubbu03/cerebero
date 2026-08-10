import type { ItemCommand, ItemView } from '@cerebero/contracts'
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { Button } from '@cerebero/ui'
import { useState } from 'react'

import { ItemMutationError } from '../data-access/item-mutation-error'

type ItemDetailUiActionsProps = {
  isActing: boolean
  item: ItemView
  onLeftLibrary: () => void
  onPermanentlyDeleted: () => void
  runAction: (command: ItemCommand) => Promise<unknown>
}

export function ItemDetailUiActions({
  isActing,
  item,
  onLeftLibrary,
  onPermanentlyDeleted,
  runAction,
}: ItemDetailUiActionsProps) {
  const [error, setError] = useState<string | null>(null)
  const [confirmTrash, setConfirmTrash] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const act = async (command: ItemCommand) => {
    setError(null)
    try {
      await runAction(command)
      if (command.type === 'archive' || command.type === 'trash') {
        onLeftLibrary()
      }
      if (command.type === 'delete_permanently') {
        onPermanentlyDeleted()
      }
      setConfirmTrash(false)
      setConfirmDelete(false)
    } catch (caught) {
      if (caught instanceof ItemMutationError) {
        setError(caught.message)
        return
      }
      setError('The action could not be completed. Try again.')
    }
  }

  if (item.status === 'library') {
    const isPinned = Boolean(item.pinnedAt)
    return (
      <section aria-label="Item actions" className="mt-4">
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isActing}
            onClick={() => {
              void act({
                expectedVersion: item.version,
                type: isPinned ? 'unpin' : 'pin',
              })
            }}
            size="compact"
            variant="outline"
          >
            {isPinned ? (
              <PushPinSlashIcon aria-hidden="true" size={16} />
            ) : (
              <PushPinIcon aria-hidden="true" size={16} />
            )}
            {isPinned ? 'Unpin' : 'Pin'}
          </Button>

          <Button
            disabled={isActing}
            onClick={() => {
              void act({ expectedVersion: item.version, type: 'archive' })
            }}
            size="compact"
            variant="outline"
          >
            <ArchiveIcon aria-hidden="true" size={16} />
            Archive
          </Button>

          {confirmTrash ? (
            <>
              <Button
                disabled={isActing}
                onClick={() => {
                  void act({ expectedVersion: item.version, type: 'trash' })
                }}
                size="compact"
                variant="accent"
              >
                Confirm trash
              </Button>
              <Button
                disabled={isActing}
                onClick={() => setConfirmTrash(false)}
                size="compact"
                variant="ghost"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              disabled={isActing}
              onClick={() => setConfirmTrash(true)}
              size="compact"
              variant="outline"
            >
              <TrashIcon aria-hidden="true" size={16} />
              Move to Trash
            </Button>
          )}
        </div>
        {error ? (
          <p className="text-danger-strong mt-3 text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    )
  }

  if (item.status === 'archived') {
    return (
      <section aria-label="Item actions" className="mt-4">
        <p className="text-secondary mb-3 text-sm">
          Archived Items cannot be edited, pinned, or shared.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isActing}
            onClick={() => {
              void act({ expectedVersion: item.version, type: 'restore' })
            }}
            size="compact"
            variant="outline"
          >
            <ArrowCounterClockwiseIcon aria-hidden="true" size={16} />
            Restore to Library
          </Button>
          {confirmTrash ? (
            <>
              <Button
                disabled={isActing}
                onClick={() => {
                  void act({ expectedVersion: item.version, type: 'trash' })
                }}
                size="compact"
              >
                Confirm trash
              </Button>
              <Button
                disabled={isActing}
                onClick={() => setConfirmTrash(false)}
                size="compact"
                variant="ghost"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              disabled={isActing}
              onClick={() => setConfirmTrash(true)}
              size="compact"
              variant="ghost"
            >
              <TrashIcon aria-hidden="true" size={16} />
              Move to Trash
            </Button>
          )}
        </div>
        {error ? (
          <p className="text-danger-strong mt-3 text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    )
  }

  return (
    <section aria-label="Item actions" className="mt-4">
      <p className="text-secondary mb-3 text-sm">
        Trashed Items are kept for thirty days, then permanently deleted.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isActing}
          onClick={() => {
            void act({ expectedVersion: item.version, type: 'restore' })
          }}
          size="compact"
          variant="outline"
        >
          <ArrowCounterClockwiseIcon aria-hidden="true" size={16} />
          Restore to Library
        </Button>
        {confirmDelete ? (
          <>
            <Button
              disabled={isActing}
              onClick={() => {
                void act({
                  confirm: true,
                  expectedVersion: item.version,
                  type: 'delete_permanently',
                })
              }}
              size="compact"
            >
              Confirm permanent delete
            </Button>
            <Button
              disabled={isActing}
              onClick={() => setConfirmDelete(false)}
              size="compact"
              variant="ghost"
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            disabled={isActing}
            onClick={() => setConfirmDelete(true)}
            size="compact"
            variant="ghost"
          >
            <TrashIcon aria-hidden="true" size={16} />
            Delete permanently
          </Button>
        )}
      </div>
      {error ? (
        <p className="text-danger-strong mt-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
