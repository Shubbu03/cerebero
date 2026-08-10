export function LibraryUiLoading() {
  return (
    <div
      aria-label="Loading Library Items"
      className="mt-6 grid gap-2"
      role="status"
    >
      <span className="sr-only">Loading Library</span>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className="bg-surface rounded-surface h-28 animate-pulse"
          key={index}
        />
      ))}
    </div>
  )
}
