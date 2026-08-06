export function Wordmark() {
  return (
    <div className="flex items-center gap-3" aria-label="Cerebero">
      <span
        aria-hidden="true"
        className="bg-primary text-canvas border-strong grid size-8 place-items-center border text-xs font-bold [clip-path:polygon(0_0,100%_0,100%_74%,74%_100%,0_100%)]"
      >
        C
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">
        Cerebero
      </span>
    </div>
  )
}
