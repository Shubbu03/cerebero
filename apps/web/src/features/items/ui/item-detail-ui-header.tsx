import type { ItemView } from '@cerebero/contracts'
import { ArrowLeftIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { Button } from '@cerebero/ui'

type ItemDetailUiHeaderProps = {
  isEditing: boolean
  item: ItemView
  onStartEdit: () => void
}

export function ItemDetailUiHeader({
  isEditing,
  item,
  onStartEdit,
}: ItemDetailUiHeaderProps) {
  const canEdit = item.status === 'library' && !isEditing

  return (
    <>
      <Link
        className="text-secondary hover:text-primary focus-visible:ring-focus rounded-control inline-flex items-center gap-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        to="/library"
      >
        <ArrowLeftIcon aria-hidden="true" size={16} /> Library
      </Link>

      <header className="border-border-strong mt-4 border-b pb-6 sm:mt-5 sm:pb-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(2.75rem,5vw,4.5rem)] leading-[0.96] font-medium tracking-[-0.045em] [overflow-wrap:anywhere]">
              {item.displayTitle}
            </h1>
          </div>

          {canEdit ? (
            <Button onClick={onStartEdit} size="compact" variant="outline">
              <PencilSimpleIcon aria-hidden="true" size={16} />
              Edit
            </Button>
          ) : null}
        </div>
      </header>
    </>
  )
}
