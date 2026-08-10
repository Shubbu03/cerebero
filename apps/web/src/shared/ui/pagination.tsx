import {
  CaretLeftIcon,
  CaretRightIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react'

type PaginationProps = {
  canGoNext: boolean
  canGoPrevious: boolean
  compact?: boolean
  isNextPageError: boolean
  isNextPageLoading: boolean
  label: string
  nextPage: () => void
  pageNumber: number
  previousPage: () => void
}

const pageButtonClassName =
  'text-secondary hover:bg-raised hover:text-primary focus-visible:ring-accent-strong focus-visible:ring-offset-canvas inline-flex items-center gap-1.5 rounded-full text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35'

export function Pagination({
  canGoNext,
  canGoPrevious,
  compact = false,
  isNextPageError,
  isNextPageLoading,
  label,
  nextPage,
  pageNumber,
  previousPage,
}: PaginationProps) {
  return (
    <nav
      aria-label={`${label} pagination`}
      className={`mt-auto flex flex-col items-center gap-3 ${compact ? 'pt-4' : 'pt-8'}`}
    >
      {isNextPageError ? (
        <p className="text-danger-strong text-sm" role="alert">
          The next page could not be loaded. Try again.
        </p>
      ) : null}

      <div className="border-border-subtle bg-surface shadow-raised inline-flex items-center gap-1 rounded-full border p-1">
        <button
          aria-label={`Previous ${label} page`}
          className={`${pageButtonClassName} ${compact ? 'h-8 px-2.5' : 'h-10 px-3 sm:px-4'}`}
          disabled={!canGoPrevious || isNextPageLoading}
          onClick={previousPage}
          type="button"
        >
          <CaretLeftIcon aria-hidden="true" size={17} weight="bold" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span
          aria-current="page"
          className={`bg-accent text-accent-foreground inline-flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${compact ? 'size-8 text-xs' : 'size-10 text-sm'}`}
        >
          {pageNumber}
        </span>

        <button
          aria-label={`Next ${label} page`}
          className={`${pageButtonClassName} ${compact ? 'h-8 px-2.5' : 'h-10 px-3 sm:px-4'}`}
          disabled={!canGoNext || isNextPageLoading}
          onClick={nextPage}
          type="button"
        >
          <span className="hidden sm:inline">
            {isNextPageError ? 'Try again' : 'Next'}
          </span>
          {isNextPageLoading ? (
            <SpinnerGapIcon
              aria-hidden="true"
              className="animate-spin"
              size={17}
              weight="bold"
            />
          ) : (
            <CaretRightIcon aria-hidden="true" size={17} weight="bold" />
          )}
        </button>
      </div>
    </nav>
  )
}
