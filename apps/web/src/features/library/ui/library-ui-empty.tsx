import { BooksIcon } from '@phosphor-icons/react'

export function LibraryUiEmpty() {
  return (
    <div className="border-border-subtle bg-surface mt-10 border px-6 py-16 text-center sm:py-24">
      <BooksIcon
        aria-hidden="true"
        className="text-tertiary mx-auto"
        size={30}
      />
      <h2 className="font-display mt-5 text-3xl">Your Library is empty.</h2>
      <p className="text-secondary mx-auto mt-3 max-w-md text-sm leading-6">
        Capture a link or note and it will appear here.
      </p>
    </div>
  )
}
