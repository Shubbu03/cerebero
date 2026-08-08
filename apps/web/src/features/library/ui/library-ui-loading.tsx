export function LibraryUiLoading() {
  return (
    <div
      aria-label="Loading Library Items"
      className="mt-10 grid gap-px"
      role="status"
    >
      <span className="sr-only">Loading Library</span>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className="border-border-subtle bg-surface h-32 animate-pulse border-y"
          key={index}
        />
      ))}
    </div>
  )
}
