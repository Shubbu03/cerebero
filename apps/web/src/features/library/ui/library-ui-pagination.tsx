import { Button } from '@cerebero/ui'

type LibraryUiPaginationProps = {
  hasMoreItems: boolean
  isError: boolean
  isLoading: boolean
  loadMore: () => void
}

export function LibraryUiPagination({
  hasMoreItems,
  isError,
  isLoading,
  loadMore,
}: LibraryUiPaginationProps) {
  if (!hasMoreItems && !isError) {
    return null
  }

  return (
    <div className="mt-8 text-center">
      {isError ? (
        <p className="text-danger-strong mb-3 text-sm" role="alert">
          More Items could not be loaded.
        </p>
      ) : null}
      <Button disabled={isLoading} onClick={loadMore} variant="outline">
        {isLoading ? 'Loading…' : isError ? 'Try again' : 'Load more'}
      </Button>
    </div>
  )
}
