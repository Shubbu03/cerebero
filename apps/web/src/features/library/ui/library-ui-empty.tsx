import { BooksIcon } from '@phosphor-icons/react'

type LibraryUiEmptyProps = {
  filtered?: boolean
  onClearFilters?: () => void
}

export function LibraryUiEmpty({
  filtered = false,
  onClearFilters,
}: LibraryUiEmptyProps) {
  return (
    <div className="bg-surface rounded-panel mt-8 px-6 py-16 text-center sm:py-24">
      <BooksIcon
        aria-hidden="true"
        className="text-tertiary mx-auto"
        size={30}
      />
      <h2 className="font-display mt-5 text-3xl">
        {filtered ? 'No Items match these filters.' : 'Your Library is empty.'}
      </h2>
      <p className="text-secondary mx-auto mt-3 max-w-md text-sm leading-6">
        {filtered
          ? 'Clear the current filters to return to your full Library.'
          : 'Capture a link or note and it will appear here.'}
      </p>
      {filtered && onClearFilters ? (
        <button
          className="text-accent-strong focus-visible:ring-focus rounded-control mt-5 min-h-11 px-3 text-sm font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
          onClick={onClearFilters}
          type="button"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  )
}
