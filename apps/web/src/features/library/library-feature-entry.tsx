import { useLibraryItemsQuery } from './data-access/use-library-items-query'
import { LibraryUiEmpty } from './ui/library-ui-empty'
import { LibraryUiError } from './ui/library-ui-error'
import { LibraryUiHeader } from './ui/library-ui-header'
import { LibraryUiList } from './ui/library-ui-list'
import { LibraryUiLoading } from './ui/library-ui-loading'
import { LibraryUiPagination } from './ui/library-ui-pagination'

export function LibraryFeatureEntry() {
  const libraryQuery = useLibraryItemsQuery()
  const items = libraryQuery.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <LibraryUiHeader
        isRefreshing={
          libraryQuery.isRefetching && !libraryQuery.isFetchingNextPage
        }
        itemCount={libraryQuery.isPending ? null : items.length}
      />

      {libraryQuery.isPending ? <LibraryUiLoading /> : null}

      {libraryQuery.isError ? (
        <LibraryUiError
          isRetrying={libraryQuery.isFetching}
          retry={() => void libraryQuery.refetch()}
        />
      ) : null}

      {libraryQuery.isSuccess && items.length === 0 ? <LibraryUiEmpty /> : null}

      {libraryQuery.isSuccess && items.length > 0 ? (
        <>
          <LibraryUiList items={items} />
          <LibraryUiPagination
            hasMoreItems={libraryQuery.hasNextPage}
            isError={libraryQuery.isFetchNextPageError}
            isLoading={libraryQuery.isFetchingNextPage}
            loadMore={() => void libraryQuery.fetchNextPage()}
          />
        </>
      ) : null}
    </section>
  )
}
