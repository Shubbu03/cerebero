import type { ItemView } from '@cerebero/contracts'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Field, FormMessage, Input, Textarea } from '@cerebero/ui'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import {
  itemEditFormSchema,
  type ItemEditFormInput,
  toUpdateItemInput,
} from '../item-edit-schemas'
import { ItemMutationError } from '../data-access/item-mutation-error'
import { MarkdownContent } from '../../markdown/markdown-content'

type ItemDetailUiEditFormProps = {
  isSaving: boolean
  item: ItemView
  onCancel: () => void
  onConflict: () => void
  onSaved: () => void
  save: (input: ReturnType<typeof toUpdateItemInput>) => Promise<unknown>
}

export function ItemDetailUiEditForm({
  isSaving,
  item,
  onCancel,
  onConflict,
  onSaved,
  save,
}: ItemDetailUiEditFormProps) {
  const [noteMode, setNoteMode] = useState<'source' | 'preview'>('source')
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ItemEditFormInput>({
    defaultValues: {
      authoredTitle: item.authoredTitle ?? '',
      noteMarkdown: item.noteMarkdown ?? '',
      originalUrl: item.originalUrl ?? '',
    },
    resolver: zodResolver(itemEditFormSchema),
  })
  const noteMarkdown = useWatch({ control, name: 'noteMarkdown' })

  useEffect(() => {
    reset({
      authoredTitle: item.authoredTitle ?? '',
      noteMarkdown: item.noteMarkdown ?? '',
      originalUrl: item.originalUrl ?? '',
    })
  }, [item, reset])

  const submit = handleSubmit(async (values) => {
    try {
      await save(toUpdateItemInput(values, item.version))
      onSaved()
    } catch (error) {
      if (error instanceof ItemMutationError && error.code === 'conflict') {
        onConflict()
        return
      }

      const message =
        error instanceof Error
          ? error.message
          : 'The Item could not be saved. Try again.'
      setError('root', { message })
    }
  })

  const busy = isSaving || isSubmitting

  return (
    <form
      className="border-border-subtle bg-surface mt-8 grid gap-5 border p-5 sm:p-6"
      noValidate
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <div>
        <h2 className="text-base font-semibold">Edit Item</h2>
        <p className="text-secondary mt-1 text-sm">
          Changes save immediately. No remote fetching runs on edit.
        </p>
      </div>

      <Field
        error={errors.authoredTitle?.message}
        htmlFor="item-edit-title"
        label="Title"
      >
        <Input
          autoComplete="off"
          id="item-edit-title"
          placeholder="Optional authored title"
          {...register('authoredTitle')}
        />
      </Field>

      <Field
        description="HTTP or HTTPS only."
        error={errors.originalUrl?.message}
        htmlFor="item-edit-url"
        label="URL"
      >
        <Input
          autoComplete="off"
          id="item-edit-url"
          inputMode="url"
          placeholder="https://example.com"
          {...register('originalUrl')}
        />
      </Field>

      <Field
        description="Markdown source. Keep notes private and useful."
        error={errors.noteMarkdown?.message}
        htmlFor="item-edit-note"
        label="Note"
      >
        <div
          className="border-border-subtle mb-2 flex w-fit border p-1"
          role="group"
          aria-label="Note editor mode"
        >
          <button
            aria-pressed={noteMode === 'source'}
            className={`rounded-control focus-visible:ring-focus min-h-9 px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none ${
              noteMode === 'source'
                ? 'bg-accent text-accent-foreground'
                : 'text-secondary hover:bg-sunken hover:text-primary'
            }`}
            onClick={() => setNoteMode('source')}
            type="button"
          >
            Write
          </button>
          <button
            aria-pressed={noteMode === 'preview'}
            className={`rounded-control focus-visible:ring-focus min-h-9 px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none ${
              noteMode === 'preview'
                ? 'bg-accent text-accent-foreground'
                : 'text-secondary hover:bg-sunken hover:text-primary'
            }`}
            onClick={() => setNoteMode('preview')}
            type="button"
          >
            Preview
          </button>
        </div>
        <Textarea
          className={noteMode === 'preview' ? 'hidden' : undefined}
          id="item-edit-note"
          rows={10}
          {...register('noteMarkdown')}
        />
        {noteMode === 'preview' ? (
          <div
            className="border-border-subtle bg-canvas min-h-60 border p-4 sm:p-5"
            aria-label="Markdown preview"
          >
            <MarkdownContent>{noteMarkdown}</MarkdownContent>
          </div>
        ) : null}
      </Field>

      {errors.root?.message ? (
        <FormMessage>{errors.root.message}</FormMessage>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          disabled={busy}
          onClick={onCancel}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
