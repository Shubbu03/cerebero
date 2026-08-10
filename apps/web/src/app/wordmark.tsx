export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-center ${compact ? '' : 'gap-3'}`}
      aria-label="Cerebero"
    >
      <span
        aria-hidden="true"
        className="bg-primary text-canvas border-strong grid size-8 place-items-center border text-xs font-bold [clip-path:polygon(0_0,100%_0,100%_74%,74%_100%,0_100%)]"
      >
        C
      </span>
      {!compact ? (
        <span className="font-display text-xl font-semibold tracking-tight">
          Cerebero
        </span>
      ) : null}
    </div>
  )
}
