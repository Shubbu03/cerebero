import { Suspense, type ReactNode } from 'react'

function RouteLoading({ label }: { label: string }) {
  return (
    <main
      className="bg-canvas text-primary grid min-h-dvh place-items-center px-5"
      aria-busy="true"
    >
      <p className="text-secondary text-sm">{label}</p>
    </main>
  )
}

export function RouteSuspense({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <Suspense fallback={<RouteLoading label={label} />}>{children}</Suspense>
  )
}

export function FeatureSuspense({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <Suspense
      fallback={
        <div
          className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-10"
          aria-busy="true"
          role="status"
        >
          <p className="text-secondary text-sm">{label}</p>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
