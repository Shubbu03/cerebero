import { ArrowLeftIcon } from '@phosphor-icons/react'

export function ItemDetailUiLoading() {
  return (
    <section
      className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-14"
      aria-label="Loading Item"
      role="status"
    >
      <div className="text-tertiary flex items-center gap-2 text-sm">
        <ArrowLeftIcon aria-hidden="true" size={16} /> Inbox
      </div>
      <div className="border-border-strong mt-8 border-b pb-8">
        <div className="bg-sunken h-3 w-24 motion-safe:animate-pulse" />
        <div className="bg-sunken mt-5 h-12 w-4/5 max-w-2xl motion-safe:animate-pulse" />
        <div className="bg-sunken mt-4 h-4 w-48 motion-safe:animate-pulse" />
      </div>
      <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-3">
          <div className="bg-sunken h-4 w-full motion-safe:animate-pulse" />
          <div className="bg-sunken h-4 w-5/6 motion-safe:animate-pulse" />
          <div className="bg-sunken h-4 w-2/3 motion-safe:animate-pulse" />
        </div>
        <div className="border-border-subtle border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7">
          <div className="bg-sunken h-24 w-full motion-safe:animate-pulse" />
        </div>
      </div>
    </section>
  )
}
