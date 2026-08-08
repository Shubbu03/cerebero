import type { DuplicateCandidate } from '@cerebero/contracts'
import { CopyIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@cerebero/ui'

type CaptureUiDuplicateNoticeProps = {
  candidates: DuplicateCandidate[]
  editCapture: () => void
  error: string | null
  isSaving: boolean
  keepExisting: () => void
  saveAnotherCopy: () => void
}

export function CaptureUiDuplicateNotice({
  candidates,
  editCapture,
  error,
  isSaving,
  keepExisting,
  saveAnotherCopy,
}: CaptureUiDuplicateNoticeProps) {
  return (
    <section
      className="border-warning-border bg-warning-soft rounded-surface border p-4 sm:p-5"
      aria-labelledby="duplicate-capture-title"
    >
      <div className="flex items-start gap-3">
        <WarningCircleIcon
          className="text-warning-strong mt-0.5 shrink-0"
          aria-hidden="true"
          size={20}
        />
        <div className="min-w-0">
          <h2 className="font-semibold" id="duplicate-capture-title">
            This link is already in your collection.
          </h2>
          <p className="text-secondary mt-1 text-sm leading-6">
            Nothing was changed. Keep the existing Item or deliberately save a
            separate copy.
          </p>
          <ul className="border-warning-border mt-3 grid gap-2 border-t pt-3">
            {candidates.slice(0, 3).map((candidate) => (
              <li className="min-w-0 text-sm" key={candidate.id}>
                <span className="block truncate font-semibold">
                  {candidate.displayTitle}
                </span>
                <span className="text-tertiary text-xs capitalize">
                  {candidate.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {error ? (
        <p className="text-danger-strong mt-4 text-sm font-medium" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button disabled={isSaving} onClick={editCapture} variant="ghost">
          Edit capture
        </Button>
        <Button disabled={isSaving} onClick={keepExisting} variant="outline">
          Keep existing
        </Button>
        <Button disabled={isSaving} onClick={saveAnotherCopy}>
          <CopyIcon aria-hidden="true" size={17} />
          {isSaving ? 'Saving copy…' : 'Save another copy'}
        </Button>
      </div>
    </section>
  )
}
