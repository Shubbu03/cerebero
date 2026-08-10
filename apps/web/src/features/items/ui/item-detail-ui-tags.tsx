import type { ItemView, TagView } from '@cerebero/contracts'
import { CaretDownIcon } from '@phosphor-icons/react'
import { Button, Field, FormMessage, Input } from '@cerebero/ui'
import { useMemo, useState } from 'react'

import { TagMutationError } from '../../tags/data-access/tag-mutation-error'
import { formatTagName, normalizeTagNameInput } from '../../tags/tag-name'

type ItemDetailUiTagsProps = {
  attachTag: (tagId: string) => Promise<unknown>
  createTag: (name: string) => Promise<TagView>
  detachTag: (tagId: string) => Promise<unknown>
  isBusy: boolean
  item: ItemView
  tags: TagView[]
}

export function ItemDetailUiTags({
  attachTag,
  createTag,
  detachTag,
  isBusy,
  item,
  tags,
}: ItemDetailUiTagsProps) {
  const [error, setError] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [selectedTagId, setSelectedTagId] = useState('')

  const availableTags = useMemo(() => {
    const attached = new Set(item.tags.map((tag) => tag.id))
    return tags.filter((tag) => !attached.has(tag.id))
  }, [item.tags, tags])

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

  const canEdit = item.status === 'library'

  return (
    <section
      aria-labelledby="item-tags-editor-title"
      className="bg-surface rounded-surface p-4 sm:p-5"
    >
      <h2
        className="text-tertiary font-mono text-xs"
        id="item-tags-editor-title"
      >
        Tags
      </h2>

      {item.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <li key={tag.id}>
              <span className="border-border-subtle bg-sunken text-secondary inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs [overflow-wrap:anywhere]">
                {formatTagName(tag.name)}
                {canEdit ? (
                  <button
                    className="text-tertiary hover:text-primary focus-visible:ring-focus rounded-full px-1 focus-visible:ring-2 focus-visible:outline-none"
                    disabled={isBusy}
                    onClick={() => {
                      void run(() => detachTag(tag.id))
                    }}
                    type="button"
                  >
                    <span aria-hidden="true">×</span>
                    <span className="sr-only">
                      Remove {formatTagName(tag.name)}
                    </span>
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-tertiary mt-2 text-sm">No tags</p>
      )}

      {canEdit ? (
        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid min-w-[12rem] flex-1 gap-1.5 text-xs font-medium">
              Attach existing Tag
              <span className="relative block">
                <select
                  className="border-border-strong bg-canvas text-primary focus-visible:ring-focus rounded-control h-10 w-full appearance-none border px-3 pr-10 text-sm leading-none outline-none focus-visible:ring-2"
                  disabled={isBusy || availableTags.length === 0}
                  onChange={(event) => setSelectedTagId(event.target.value)}
                  value={selectedTagId}
                >
                  <option value="">
                    {availableTags.length === 0
                      ? 'No more Tags available'
                      : 'Choose a Tag'}
                  </option>
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {formatTagName(tag.name)}
                    </option>
                  ))}
                </select>
                <CaretDownIcon
                  aria-hidden="true"
                  className="text-secondary pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                  size={15}
                  weight="bold"
                />
              </span>
            </label>
            <Button
              disabled={isBusy || !selectedTagId}
              onClick={() => {
                if (!selectedTagId) {
                  return
                }
                void run(async () => {
                  await attachTag(selectedTagId)
                  setSelectedTagId('')
                })
              }}
              size="compact"
              variant="outline"
            >
              Attach
            </Button>
          </div>

          <Field htmlFor="item-create-tag" label="Create and attach Tag">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <span
                  aria-hidden="true"
                  className="text-secondary pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm"
                >
                  #
                </span>
                <Input
                  autoComplete="off"
                  className="pl-7"
                  disabled={isBusy}
                  id="item-create-tag"
                  onChange={(event) =>
                    setNewTagName(event.target.value.replace(/^#+/, ''))
                  }
                  placeholder="tag-name"
                  value={newTagName}
                />
              </div>
              <Button
                disabled={
                  isBusy || normalizeTagNameInput(newTagName).length === 0
                }
                onClick={() => {
                  void run(async () => {
                    const tag = await createTag(
                      normalizeTagNameInput(newTagName),
                    )
                    await attachTag(tag.id)
                    setNewTagName('')
                  })
                }}
                size="compact"
                variant="outline"
              >
                Create
              </Button>
            </div>
          </Field>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3">
          <FormMessage>{error}</FormMessage>
        </div>
      ) : null}
    </section>
  )
}
