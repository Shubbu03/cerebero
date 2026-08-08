import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  FileXIcon,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { Button } from '@cerebero/ui'

type ItemDetailUiUnavailableProps = {
  canRetry: boolean
  isRetrying?: boolean | undefined
  retry?: (() => void) | undefined
}

export function ItemDetailUiUnavailable({
  canRetry,
  isRetrying = false,
  retry,
}: ItemDetailUiUnavailableProps) {
  return (
    <section className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl place-items-center px-5 py-12 text-center sm:px-8 lg:px-10">
      <div className="max-w-md">
        <FileXIcon
          className="text-tertiary mx-auto"
          aria-hidden="true"
          size={34}
        />
        <p className="text-tertiary mt-5 font-mono text-xs tracking-[0.16em] uppercase">
          Item unavailable
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.035em]">
          Nothing can be opened here.
        </h1>
        <p className="text-secondary mt-4 text-sm leading-6">
          The Item may have moved, been removed, or become temporarily
          unavailable.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link
            className="border-border-strong bg-surface text-primary hover:border-accent-strong hover:bg-sunken focus-visible:ring-focus rounded-control inline-flex min-h-10 items-center justify-center gap-2 border px-4 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            to="/inbox"
          >
            <ArrowLeftIcon aria-hidden="true" size={17} /> Return to Inbox
          </Link>
          {canRetry && retry ? (
            <Button disabled={isRetrying} onClick={retry}>
              <ArrowClockwiseIcon aria-hidden="true" size={17} />
              {isRetrying ? 'Trying again…' : 'Try again'}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
