const loadingRows = ['one', 'two', 'three'] as const

export function InboxUiLoading() {
  return (
    <div
      className="border-border-subtle mt-8 border-y sm:mt-10"
      aria-label="Loading Inbox Items"
      role="status"
    >
      {loadingRows.map((row) => (
        <div
          className="border-border-subtle grid min-h-40 gap-5 border-b px-1 py-6 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:px-3"
          key={row}
        >
          <div className="bg-sunken hidden size-9 motion-safe:animate-pulse sm:block" />
          <div>
            <div className="bg-sunken h-5 w-2/3 max-w-md motion-safe:animate-pulse" />
            <div className="bg-sunken mt-3 h-3 w-32 motion-safe:animate-pulse" />
            <div className="bg-sunken mt-5 h-3 w-full max-w-xl motion-safe:animate-pulse" />
            <div className="bg-sunken mt-2 h-3 w-4/5 max-w-lg motion-safe:animate-pulse" />
          </div>
          <div className="bg-sunken h-3 w-20 motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  )
}
