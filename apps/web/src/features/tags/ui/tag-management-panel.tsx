import type { TagView } from '@cerebero/contracts'
import {
  CheckIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react'
import { Button, FormMessage, IconButton, Input } from '@cerebero/ui'
import { useState } from 'react'

import { Pagination } from '../../../shared/ui/pagination'
import { TagMutationError } from '../data-access/tag-mutation-error'
import { formatTagName, normalizeTagNameInput } from '../tag-name'

type TagManagementPanelProps = {
  createTag: (name: string) => Promise<unknown>
  deleteTag: (tagId: string) => Promise<unknown>
  isBusy: boolean
  renameTag: (tagId: string, name: string) => Promise<unknown>
  tags: TagView[]
}

const TAGS_PER_PAGE = 20

export function TagManagementPanel({
  createTag,
  deleteTag,
  isBusy,
  renameTag,
  tags,
}: TagManagementPanelProps) {
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [requestedPageIndex, setRequestedPageIndex] = useState(0)
  const pageCount = Math.max(1, Math.ceil(tags.length / TAGS_PER_PAGE))
  const pageIndex = Math.min(requestedPageIndex, pageCount - 1)
  const visibleTags = tags.slice(
    pageIndex * TAGS_PER_PAGE,
    (pageIndex + 1) * TAGS_PER_PAGE,
  )

  const clearCardState = () => {
    setEditingId(null)
    setDraftName('')
    setConfirmDeleteId(null)
  }

  const clearCreateState = () => {
    setIsCreating(false)
    setNewTagName('')
  }

  const run = async (operation: () => Promise<unknown>) => {
    setError(null)
    try {
      await operation()
    } catch (caught) {
      if (caught instanceof TagMutationError) {
        setError(caught.message)
        return
      }
      setError('The Tag change could not be completed. Try again.')
    }
  }

  return (
    <div className="mt-4 flex min-h-0 flex-col">
      <div className="mb-3 flex min-h-8 items-center justify-end">
        {isCreating ? (
          <form
            className="flex w-full items-center justify-end gap-1.5 sm:max-w-sm"
            onSubmit={(event) => {
              event.preventDefault()
              const name = normalizeTagNameInput(newTagName)
              if (!name) return
              void run(async () => {
                await createTag(name)
                clearCreateState()
              })
            }}
          >
            <div className="relative min-w-0 flex-1">
              <span
                aria-hidden="true"
                className="text-secondary pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm"
              >
                #
              </span>
              <Input
                aria-label="New tag name"
                autoComplete="off"
                autoFocus
                className="min-h-8 py-1 pl-7"
                disabled={isBusy}
                maxLength={64}
                onChange={(event) =>
                  setNewTagName(event.target.value.replace(/^#+/, ''))
                }
                placeholder="tag-name"
                value={newTagName}
              />
            </div>
            <IconButton
              className="size-8 shrink-0"
              disabled={
                isBusy || normalizeTagNameInput(newTagName).length === 0
              }
              label="Create tag"
              type="submit"
            >
              <CheckIcon aria-hidden="true" size={16} weight="bold" />
            </IconButton>
            <IconButton
              className="size-8 shrink-0"
              disabled={isBusy}
              label="Cancel new tag"
              onClick={clearCreateState}
            >
              <XIcon aria-hidden="true" size={16} />
            </IconButton>
          </form>
        ) : (
          <Button
            disabled={isBusy}
            onClick={() => {
              clearCardState()
              setIsCreating(true)
            }}
            size="compact"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" size={15} weight="bold" />
            New tag
          </Button>
        )}
      </div>

      {tags.length === 0 ? (
        <p className="text-tertiary py-6 text-center text-sm">
          No tags yet. Add your first one above.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {visibleTags.map((tag) => {
            const isEditing = editingId === tag.id
            const isConfirmingDelete = confirmDeleteId === tag.id

            return (
              <li
                className="bg-surface rounded-control flex min-h-12 min-w-0 items-center gap-1 px-2.5 py-1.5"
                key={tag.id}
              >
                {isEditing ? (
                  <div className="relative min-w-0 flex-1">
                    <span
                      aria-hidden="true"
                      className="text-secondary pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm"
                    >
                      #
                    </span>
                    <Input
                      aria-label={`Rename ${formatTagName(tag.name)}`}
                      autoComplete="off"
                      autoFocus
                      className="min-h-8 min-w-0 py-1 pl-7"
                      disabled={isBusy}
                      onChange={(event) =>
                        setDraftName(event.target.value.replace(/^#+/, ''))
                      }
                      value={draftName}
                    />
                  </div>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {formatTagName(tag.name)}
                  </span>
                )}

                <div className="ml-auto flex shrink-0 items-center justify-end gap-0.5">
                  {isEditing ? (
                    <>
                      <IconButton
                        className="size-8"
                        disabled={
                          isBusy ||
                          normalizeTagNameInput(draftName).length === 0
                        }
                        label={`Save rename for ${formatTagName(tag.name)}`}
                        onClick={() => {
                          void run(async () => {
                            await renameTag(
                              tag.id,
                              normalizeTagNameInput(draftName),
                            )
                            clearCardState()
                          })
                        }}
                      >
                        <CheckIcon aria-hidden="true" size={17} weight="bold" />
                      </IconButton>
                      <IconButton
                        className="size-8"
                        disabled={isBusy}
                        label={`Cancel rename for ${formatTagName(tag.name)}`}
                        onClick={clearCardState}
                      >
                        <XIcon aria-hidden="true" size={17} />
                      </IconButton>
                    </>
                  ) : isConfirmingDelete ? (
                    <>
                      <span className="text-danger-strong text-xs font-semibold">
                        Delete?
                      </span>
                      <IconButton
                        className="size-8"
                        disabled={isBusy}
                        label={`Confirm delete ${formatTagName(tag.name)}`}
                        onClick={() => {
                          void run(async () => {
                            await deleteTag(tag.id)
                            clearCardState()
                          })
                        }}
                      >
                        <CheckIcon aria-hidden="true" size={17} weight="bold" />
                      </IconButton>
                      <IconButton
                        className="size-8"
                        disabled={isBusy}
                        label={`Cancel delete ${formatTagName(tag.name)}`}
                        onClick={clearCardState}
                      >
                        <XIcon aria-hidden="true" size={17} />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton
                        className="size-8"
                        disabled={isBusy}
                        label={`Rename ${formatTagName(tag.name)}`}
                        onClick={() => {
                          setEditingId(tag.id)
                          setDraftName(normalizeTagNameInput(tag.name))
                          setConfirmDeleteId(null)
                        }}
                      >
                        <PencilSimpleIcon aria-hidden="true" size={17} />
                      </IconButton>
                      <IconButton
                        className="hover:text-danger-strong size-8"
                        disabled={isBusy}
                        label={`Delete ${formatTagName(tag.name)}`}
                        onClick={() => {
                          setConfirmDeleteId(tag.id)
                          setEditingId(null)
                        }}
                      >
                        <TrashIcon aria-hidden="true" size={17} />
                      </IconButton>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {error ? (
        <div className="mt-3">
          <FormMessage>{error}</FormMessage>
        </div>
      ) : null}

      {pageCount > 1 ? (
        <Pagination
          canGoNext={pageIndex + 1 < pageCount}
          canGoPrevious={pageIndex > 0}
          compact
          isNextPageError={false}
          isNextPageLoading={false}
          label="Tags"
          nextPage={() => {
            clearCardState()
            setRequestedPageIndex((current) =>
              Math.min(current + 1, pageCount - 1),
            )
          }}
          pageNumber={pageIndex + 1}
          previousPage={() => {
            clearCardState()
            setRequestedPageIndex((current) => Math.max(0, current - 1))
          }}
        />
      ) : null}
    </div>
  )
}
