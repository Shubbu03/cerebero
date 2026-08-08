import type { ItemView } from '@cerebero/contracts'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

type ItemDetailUiHeaderProps = {
  item: ItemView
}

const statusLabels = {
  archived: 'Archived',
  library: 'Library',
  trashed: 'Trash',
} as const

export function ItemDetailUiHeader({ item }: ItemDetailUiHeaderProps) {
  return (
    <>
      <Link
        className="text-secondary hover:text-primary focus-visible:ring-focus rounded-control inline-flex items-center gap-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        to="/library"
      >
        <ArrowLeftIcon aria-hidden="true" size={16} /> Library
      </Link>

      <header className="border-border-strong mt-8 border-b pb-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border-border-subtle bg-sunken text-secondary rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.08em] uppercase">
              {statusLabels[item.status]}
            </span>
            <span className="text-tertiary font-mono text-[0.6875rem] tracking-[0.08em] uppercase">
              {item.kind}
            </span>
          </div>
          <h1 className="font-display mt-4 max-w-4xl text-[clamp(2.5rem,6vw,5rem)] leading-[0.96] font-medium tracking-[-0.045em] [overflow-wrap:anywhere]">
            {item.displayTitle}
          </h1>
        </div>
      </header>
    </>
  )
}
