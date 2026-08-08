type InboxUiHeaderProps = {
  hasMoreItems: boolean
  isRefreshing: boolean
  itemCount: number | null
}

function formatItemCount(itemCount: number | null, hasMoreItems: boolean) {
  if (itemCount === null) {
    return 'Loading Inbox'
  }

  if (itemCount === 0) {
    return 'Inbox clear'
  }

  return `${itemCount}${hasMoreItems ? '+' : ''} waiting`
}

export function InboxUiHeader({
  hasMoreItems,
  isRefreshing,
  itemCount,
}: InboxUiHeaderProps) {
  return (
    <header className="border-border-strong grid gap-5 border-b pb-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-accent-strong font-mono text-xs font-medium tracking-[0.18em] uppercase">
            Private collection
          </p>
          <span className="text-tertiary" aria-hidden="true">
            ·
          </span>
          <p
            className="text-tertiary font-mono text-xs tracking-[0.08em]"
            aria-live="polite"
          >
            {formatItemCount(itemCount, hasMoreItems)}
            {isRefreshing ? ' · Refreshing' : ''}
          </p>
        </div>
        <h1 className="font-display mt-3 text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.92] font-medium tracking-[-0.045em]">
          Inbox
        </h1>
      </div>
      <p className="text-secondary max-w-sm text-sm leading-6 sm:text-right">
        New links and notes wait here until you decide what belongs in your
        Library.
      </p>
    </header>
  )
}
