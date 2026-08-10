import { ArrowLeftIcon } from '@phosphor-icons/react'

export function ItemDetailUiLoading() {
  return (
    <section
      className="w-full flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12"
      aria-label="Loading Item"
      role="status"
    >
      <div className="text-tertiary flex items-center gap-2 text-sm">
        <ArrowLeftIcon aria-hidden="true" size={16} /> Library
      </div>
      <div className="border-border-strong mt-6 border-b pb-6 sm:mt-7 sm:pb-7">
        <div className="bg-sunken h-3 w-24 motion-safe:animate-pulse" />
        <div className="bg-sunken mt-5 h-12 w-4/5 max-w-2xl motion-safe:animate-pulse" />
        <div className="bg-sunken mt-4 h-4 w-48 motion-safe:animate-pulse" />
      </div>
      <div className="grid gap-7 py-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(22rem,1fr)]">
        <div className="space-y-3">
          <div className="bg-sunken h-4 w-full motion-safe:animate-pulse" />
          <div className="bg-sunken h-4 w-5/6 motion-safe:animate-pulse" />
          <div className="bg-sunken h-4 w-2/3 motion-safe:animate-pulse" />
        </div>
        <div className="bg-surface rounded-surface p-5">
          <div className="bg-sunken h-24 w-full motion-safe:animate-pulse" />
        </div>
      </div>
    </section>
  )
}
