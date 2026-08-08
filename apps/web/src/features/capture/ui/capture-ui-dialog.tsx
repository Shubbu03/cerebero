import type { CaptureItemInput, DuplicateCandidate } from '@cerebero/contracts'
import { zodResolver } from '@hookform/resolvers/zod'
import { FloppyDiskIcon, LinkSimpleIcon, XIcon } from '@phosphor-icons/react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Button,
  Field,
  FormMessage,
  IconButton,
  Input,
  Textarea,
} from '@cerebero/ui'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  captureFormSchema,
  type CaptureFormInput,
  toCaptureItemInput,
} from '../capture-schemas'
import { CaptureUiDuplicateNotice } from './capture-ui-duplicate-notice'

type CaptureAttemptResult =
  | { outcome: 'captured' }
  | { candidates: DuplicateCandidate[]; outcome: 'duplicate' }
  | { message: string; outcome: 'error' }

type CaptureUiDialogProps = {
  captureItem: (input: CaptureItemInput) => Promise<CaptureAttemptResult>
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

type DuplicateState = {
  candidates: DuplicateCandidate[]
  input: CaptureItemInput
}

const defaultValues: CaptureFormInput = {
  authoredTitle: '',
  noteMarkdown: '',
  originalUrl: '',
}

export function CaptureUiDialog({
  captureItem,
  isOpen,
  setIsOpen,
}: CaptureUiDialogProps) {
  const [duplicate, setDuplicate] = useState<DuplicateState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSavingDuplicate, setIsSavingDuplicate] = useState(false)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CaptureFormInput>({
    defaultValues,
    resolver: zodResolver(captureFormSchema),
  })

  const closeAndReset = () => {
    reset(defaultValues)
    setDuplicate(null)
    setFormError(null)
    setIsSavingDuplicate(false)
    setIsOpen(false)
  }

  const attemptCapture = async (input: CaptureItemInput) => {
    setFormError(null)
    const result = await captureItem(input)

    if (result.outcome === 'duplicate') {
      setDuplicate({ candidates: result.candidates, input })
      return
    }

    if (result.outcome === 'error') {
      setFormError(result.message)
      return
    }

    closeAndReset()
  }

  const submit = handleSubmit((input) =>
    attemptCapture(toCaptureItemInput(input, false)),
  )

  const saveAnotherCopy = async () => {
    if (!duplicate) {
      return
    }

    setIsSavingDuplicate(true)
    try {
      await attemptCapture({ ...duplicate.input, allowDuplicate: true })
    } finally {
      setIsSavingDuplicate(false)
    }
  }

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (isSubmitting || isSavingDuplicate) {
      return
    }

    if (nextIsOpen) {
      setIsOpen(true)
      return
    }

    closeAndReset()
  }

  return (
    <Dialog.Root onOpenChange={handleOpenChange} open={isOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-primary/45 fixed inset-0 z-40 backdrop-blur-[2px]" />
        <Dialog.Content className="bg-canvas text-primary border-border-strong shadow-raised sm:rounded-panel fixed inset-x-0 bottom-0 z-50 max-h-[min(92dvh,52rem)] overflow-y-auto border-t p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] focus:outline-none sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2 sm:w-[min(calc(100vw-2rem),42rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border sm:p-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-5">
            <div>
              <p className="text-accent-strong font-mono text-xs font-medium tracking-[0.18em] uppercase">
                New capture
              </p>
              <Dialog.Title className="font-display mt-2 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                Keep what matters.
              </Dialog.Title>
              <Dialog.Description className="text-secondary mt-3 max-w-lg text-sm leading-6">
                Save a link, a Markdown note, or both directly to your Library.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <IconButton
                disabled={isSubmitting || isSavingDuplicate}
                label="Close Capture"
              >
                <XIcon aria-hidden="true" size={19} />
              </IconButton>
            </Dialog.Close>
          </div>

          <form
            className="mt-8 grid gap-5"
            noValidate
            onSubmit={(event) => void submit(event)}
          >
            <Field
              description="Optional when you write a note. HTTP and HTTPS links only."
              error={errors.originalUrl?.message}
              htmlFor="capture-url"
              label="URL"
            >
              <div className="relative">
                <LinkSimpleIcon
                  className="text-tertiary pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  aria-hidden="true"
                  size={17}
                />
                <Input
                  {...register('originalUrl')}
                  aria-describedby={`capture-url-description${errors.originalUrl ? ' capture-url-error' : ''}`}
                  aria-invalid={Boolean(errors.originalUrl)}
                  autoComplete="url"
                  className="pl-10"
                  disabled={isSubmitting || Boolean(duplicate)}
                  id="capture-url"
                  inputMode="url"
                  placeholder="https://example.com/article"
                  type="url"
                />
              </div>
            </Field>

            <Field
              error={errors.authoredTitle?.message}
              htmlFor="capture-title"
              label="Title"
            >
              <Input
                {...register('authoredTitle')}
                aria-describedby={
                  errors.authoredTitle ? 'capture-title-error' : undefined
                }
                aria-invalid={Boolean(errors.authoredTitle)}
                autoComplete="off"
                disabled={isSubmitting || Boolean(duplicate)}
                id="capture-title"
                placeholder="Optional — extracted titles never overwrite this"
              />
            </Field>

            <Field
              description="Plain Markdown source. Preview and editing arrive with Item detail."
              error={errors.noteMarkdown?.message}
              htmlFor="capture-note"
              label="Note"
            >
              <Textarea
                {...register('noteMarkdown')}
                aria-describedby={`capture-note-description${errors.noteMarkdown ? ' capture-note-error' : ''}`}
                aria-invalid={Boolean(errors.noteMarkdown)}
                className="min-h-36"
                disabled={isSubmitting || Boolean(duplicate)}
                id="capture-note"
                placeholder="Write the thought you want to keep…"
              />
            </Field>

            {duplicate ? (
              <CaptureUiDuplicateNotice
                candidates={duplicate.candidates}
                editCapture={() => {
                  setDuplicate(null)
                  setFormError(null)
                }}
                error={formError}
                isSaving={isSavingDuplicate}
                keepExisting={closeAndReset}
                saveAnotherCopy={() => void saveAnotherCopy()}
              />
            ) : (
              <>
                {formError ? <FormMessage>{formError}</FormMessage> : null}
                <div className="border-border-subtle flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-tertiary text-xs leading-5">
                    Your Item is saved as soon as capture succeeds.
                  </p>
                  <div className="flex gap-2 sm:shrink-0">
                    <Button
                      disabled={isSubmitting}
                      onClick={closeAndReset}
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                    <Button disabled={isSubmitting} type="submit">
                      <FloppyDiskIcon aria-hidden="true" size={17} />
                      {isSubmitting ? 'Capturing…' : 'Save to Library'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
