import { ArrowDownIcon } from '@phosphor-icons/react'
import { Button } from '@cerebero/ui'

type InboxUiPaginationProps = {
  hasMoreItems: boolean
  isError: boolean
  isLoading: boolean
  loadMore: () => void
}

export function InboxUiPagination({
  hasMoreItems,
  isError,
  isLoading,
  loadMore,
}: InboxUiPaginationProps) {
  if (!hasMoreItems && !isError) {
    return null
  }

  return (
    <div className="grid justify-items-center gap-2 py-8">
      {isError ? (
        <p className="text-danger-strong text-sm" role="alert">
          More Items could not be loaded.
        </p>
      ) : null}
      <Button
        disabled={isLoading}
        onClick={loadMore}
        size="compact"
        variant="outline"
      >
        <ArrowDownIcon aria-hidden="true" size={16} />
        {isLoading ? 'Loading more…' : isError ? 'Try again' : 'Load more'}
      </Button>
    </div>
  )
}
