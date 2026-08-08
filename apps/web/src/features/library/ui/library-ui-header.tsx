type LibraryUiHeaderProps = {
  isRefreshing: boolean
  itemCount: number | null
}

function countLabel(itemCount: number | null) {
  if (itemCount === null) {
    return 'Loading'
  }

  return `${itemCount} saved`
}

export function LibraryUiHeader({
  isRefreshing,
  itemCount,
}: LibraryUiHeaderProps) {
  return (
    <header className="border-border-strong grid gap-6 border-b pb-8 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,25rem)] sm:items-end">
      <div>
        <p className="text-accent-strong font-mono text-xs tracking-[0.18em] uppercase">
          Private Library
          <span className="text-tertiary" aria-hidden="true">
            {' '}
            ·{' '}
          </span>
          <span className="text-tertiary">{countLabel(itemCount)}</span>
          {isRefreshing ? (
            <span className="sr-only" role="status">
              Refreshing Library
            </span>
          ) : null}
        </p>
        <h1 className="font-display mt-3 text-[clamp(3.5rem,9vw,7rem)] leading-none font-medium tracking-[-0.055em]">
          Library
        </h1>
      </div>
      <p className="text-secondary max-w-md text-sm leading-6 sm:justify-self-end sm:text-right">
        Everything you capture is saved here immediately.
      </p>
    </header>
  )
}
