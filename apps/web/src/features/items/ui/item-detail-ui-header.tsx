import type { ItemView } from '@cerebero/contracts'
import { ArrowLeftIcon, FolderSimplePlusIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { Button } from '@cerebero/ui'

type ItemDetailUiHeaderProps = {
  actionError: string | null
  fileItem: () => void
  filed: boolean
  isFiling: boolean
  item: ItemView
}

const statusLabels = {
  archived: 'Archived',
  inbox: 'Inbox',
  library: 'Library',
  trashed: 'Trash',
} as const

export function ItemDetailUiHeader({
  actionError,
  fileItem,
  filed,
  isFiling,
  item,
}: ItemDetailUiHeaderProps) {
  return (
    <>
      <Link
        className="text-secondary hover:text-primary focus-visible:ring-focus rounded-control inline-flex items-center gap-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        to="/inbox"
      >
        <ArrowLeftIcon aria-hidden="true" size={16} /> Inbox
      </Link>

      <header className="border-border-strong mt-8 grid gap-7 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
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

        <div className="lg:min-w-48 lg:text-right">
          {item.status === 'inbox' ? (
            <Button disabled={isFiling} onClick={fileItem}>
              <FolderSimplePlusIcon aria-hidden="true" size={18} />
              {isFiling ? 'Filing…' : 'File to Library'}
            </Button>
          ) : null}
          {filed ? (
            <p
              className="text-success-strong text-sm font-semibold"
              role="status"
            >
              Filed to Library.
            </p>
          ) : null}
          {actionError ? (
            <p
              className="text-danger-strong mt-2 max-w-xs text-sm"
              role="alert"
            >
              {actionError}
            </p>
          ) : null}
        </div>
      </header>
    </>
  )
}
