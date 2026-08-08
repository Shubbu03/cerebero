import { CheckCircleIcon, XIcon } from '@phosphor-icons/react'
import { IconButton } from '@cerebero/ui'

type CaptureUiSuccessNoticeProps = {
  dismiss: () => void
}

export function CaptureUiSuccessNotice({
  dismiss,
}: CaptureUiSuccessNoticeProps) {
  return (
    <div
      className="border-success-border bg-success-soft text-success-strong rounded-surface shadow-raised fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 border px-4 py-3 sm:right-6 sm:bottom-6"
      role="status"
    >
      <CheckCircleIcon aria-hidden="true" size={21} weight="fill" />
      <p className="min-w-0 flex-1 text-sm font-semibold">
        Captured to Inbox. Source details may still be loading.
      </p>
      <IconButton
        className="-mr-2 size-8 text-current"
        label="Dismiss capture confirmation"
        onClick={dismiss}
      >
        <XIcon aria-hidden="true" size={16} />
      </IconButton>
    </div>
  )
}
