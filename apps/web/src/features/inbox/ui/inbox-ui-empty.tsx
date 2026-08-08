import { TrayIcon } from '@phosphor-icons/react'

export function InboxUiEmpty() {
  return (
    <section
      className="border-border-subtle bg-surface mt-8 grid min-h-80 place-items-center border-y px-5 py-12 text-center sm:mt-10"
      aria-labelledby="empty-inbox-title"
    >
      <div className="max-w-sm">
        <span
          aria-hidden="true"
          className="border-border-strong bg-sunken mx-auto grid size-12 place-items-center border"
        >
          <TrayIcon className="text-secondary" size={22} />
        </span>
        <h2
          className="font-display mt-5 text-3xl font-semibold"
          id="empty-inbox-title"
        >
          Nothing waiting for review.
        </h2>
        <p className="text-secondary mt-3 text-sm leading-6">
          New links and notes will land here, ready for you to review and
          organize.
        </p>
      </div>
    </section>
  )
}
