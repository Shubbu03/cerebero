import type { TagView } from '@cerebero/contracts'
import { XIcon } from '@phosphor-icons/react'
import * as Dialog from '@radix-ui/react-dialog'
import { IconButton } from '@cerebero/ui'

import { TagManagementPanel } from './tag-management-panel'

type TagManagementDialogProps = {
  createTag: (name: string) => Promise<unknown>
  deleteTag: (tagId: string) => Promise<unknown>
  isBusy: boolean
  isOpen: boolean
  renameTag: (tagId: string, name: string) => Promise<unknown>
  setIsOpen: (isOpen: boolean) => void
  tags: TagView[]
}

export function TagManagementDialog({
  createTag,
  deleteTag,
  isBusy,
  isOpen,
  renameTag,
  setIsOpen,
  tags,
}: TagManagementDialogProps) {
  return (
    <Dialog.Root onOpenChange={setIsOpen} open={isOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-primary/45 fixed inset-0 z-40 backdrop-blur-[2px]" />
        <Dialog.Content className="bg-canvas text-primary border-border-strong shadow-raised rounded-panel fixed top-1/2 left-1/2 z-50 flex max-h-[min(84dvh,42rem)] w-[min(calc(100vw-2rem),56rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto border p-4 focus:outline-none sm:p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl font-semibold tracking-[-0.03em]">
                Manage tags
              </Dialog.Title>
              <Dialog.Description className="text-secondary mt-1 text-sm leading-5">
                Rename or remove tags across every item that uses them.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <IconButton disabled={isBusy} label="Close tag manager">
                <XIcon aria-hidden="true" size={18} />
              </IconButton>
            </Dialog.Close>
          </div>

          <TagManagementPanel
            createTag={createTag}
            deleteTag={deleteTag}
            isBusy={isBusy}
            renameTag={renameTag}
            tags={tags}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
