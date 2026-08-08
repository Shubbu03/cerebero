import { ArrowClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@cerebero/ui'

type InboxUiErrorProps = {
  isRetrying: boolean
  retry: () => void
}

export function InboxUiError({ isRetrying, retry }: InboxUiErrorProps) {
  return (
    <section
      className="border-danger-border bg-danger-soft mt-8 grid min-h-72 place-items-center border-y px-5 py-12 text-center sm:mt-10"
      aria-labelledby="inbox-error-title"
      role="alert"
    >
      <div className="max-w-sm">
        <WarningCircleIcon
          className="text-danger-strong mx-auto"
          aria-hidden="true"
          size={30}
        />
        <h2
          className="font-display mt-4 text-3xl font-semibold"
          id="inbox-error-title"
        >
          Your Inbox could not be opened.
        </h2>
        <p className="text-secondary mt-3 text-sm leading-6">
          Your Items are safe. Check your connection and try again.
        </p>
        <Button
          className="mt-6"
          disabled={isRetrying}
          onClick={retry}
          variant="outline"
        >
          <ArrowClockwiseIcon aria-hidden="true" size={17} />
          {isRetrying ? 'Trying again…' : 'Try again'}
        </Button>
      </div>
    </section>
  )
}
