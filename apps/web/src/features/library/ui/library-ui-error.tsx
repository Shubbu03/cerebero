import { WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@cerebero/ui'

type LibraryUiErrorProps = {
  isRetrying: boolean
  retry: () => void
}

export function LibraryUiError({ isRetrying, retry }: LibraryUiErrorProps) {
  return (
    <div className="border-danger-border bg-danger-soft mt-10 border px-6 py-12 text-center">
      <WarningCircleIcon
        aria-hidden="true"
        className="text-danger-strong mx-auto"
        size={28}
      />
      <h2 className="font-display mt-4 text-2xl">
        Your Library could not be opened.
      </h2>
      <p className="text-secondary mt-2 text-sm">
        Check that the server is running, then try again.
      </p>
      <Button className="mt-6" disabled={isRetrying} onClick={retry}>
        {isRetrying ? 'Trying again…' : 'Try again'}
      </Button>
    </div>
  )
}
