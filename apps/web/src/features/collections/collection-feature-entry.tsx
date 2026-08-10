import type { ItemView } from '@cerebero/contracts'
import { Button } from '@cerebero/ui'
import { useState } from 'react'

import { useCursorPagination } from '../../shared/data-access/use-cursor-pagination'
import { Pagination } from '../../shared/ui/pagination'
import { ItemMutationError } from '../items/data-access/item-mutation-error'
import { useItemAction } from '../items/data-access/use-item-action'
import { LibraryUiList } from '../library/ui/library-ui-list'
import {
  COLLECTION_PAGE_SIZE,
  useCollectionItemsQuery,
} from './data-access/use-collection-items-query'

type CollectionFeatureEntryProps = {
  emptyMessage: string
  status: 'archived' | 'trashed'
  title: string
}

function CollectionItemActions({
  item,
  status,
}: {
  item: ItemView
  status: 'archived' | 'trashed'
}) {
  const action = useItemAction(item.id)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const run = async (
    command:
      | { expectedVersion: number; type: 'restore' }
      | { confirm: true; expectedVersion: number; type: 'delete_permanently' }
      | { expectedVersion: number; type: 'trash' },
  ) => {
    setError(null)
    try {
      await action.mutateAsync(command)
      setConfirmDelete(false)
    } catch (caught) {
      if (caught instanceof ItemMutationError) {
        setError(caught.message)
        return
      }
      setError('The action could not be completed. Try again.')
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button
        disabled={action.isPending}
        onClick={() => {
          void run({ expectedVersion: item.version, type: 'restore' })
        }}
        size="compact"
        variant="outline"
      >
        Restore to Library
      </Button>

      {status === 'archived' ? (
        <Button
          disabled={action.isPending}
          onClick={() => {
            void run({ expectedVersion: item.version, type: 'trash' })
          }}
          size="compact"
          variant="ghost"
        >
          Move to Trash
        </Button>
      ) : confirmDelete ? (
        <>
          <Button
            disabled={action.isPending}
            onClick={() => {
              void run({
                confirm: true,
                expectedVersion: item.version,
                type: 'delete_permanently',
              })
            }}
            size="compact"
          >
            Confirm permanent delete
          </Button>
          <Button
            disabled={action.isPending}
            onClick={() => setConfirmDelete(false)}
            size="compact"
            variant="ghost"
          >
            Cancel
          </Button>
        </>
      ) : (
        <Button
          disabled={action.isPending}
          onClick={() => setConfirmDelete(true)}
          size="compact"
          variant="ghost"
        >
          Delete permanently
        </Button>
      )}

      {error ? (
        <p className="text-danger-strong w-full text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function CollectionFeatureEntry({
  emptyMessage,
  status,
  title,
}: CollectionFeatureEntryProps) {
  const query = useCollectionItemsQuery(status)
  const pagination = useCursorPagination({
    fetchNextPage: () => query.fetchNextPage(),
    hasNextPage: query.hasNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    isFetchingNextPage: query.isFetchingNextPage,
    pageSize: COLLECTION_PAGE_SIZE,
    pages: query.data?.pages,
    resetKey: status,
  })
  const items = pagination.items

  return (
    <section className="flex w-full flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="border-border-strong border-b pb-6 sm:pb-7">
        <h1 className="font-display text-[clamp(3.25rem,7vw,5.75rem)] leading-none font-medium tracking-[-0.05em]">
          {title}
        </h1>
      </header>

      {query.isPending ? (
        <p
          className="text-secondary mt-10 text-sm"
          aria-busy="true"
          role="status"
        >
          Loading…
        </p>
      ) : null}

      {query.isError ? (
        <div className="border-danger-border bg-danger-soft mt-10 border px-4 py-5">
          <p className="text-danger-strong text-sm font-semibold" role="alert">
            This collection could not be opened.
          </p>
          <button
            className="text-primary mt-3 text-sm font-medium underline underline-offset-4"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}

      {query.isSuccess && items.length === 0 ? (
        <p className="text-secondary mt-10 text-sm" role="status">
          {emptyMessage}
        </p>
      ) : null}

      {query.isSuccess && items.length > 0 ? (
        <div className="mt-4">
          <ul className="divide-border-subtle divide-y">
            {items.map((item) => (
              <li key={item.id}>
                <LibraryUiList items={[item]} />
                <div className="px-1 pb-6 sm:px-3">
                  <CollectionItemActions item={item} status={status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {query.isSuccess &&
      items.length > 0 &&
      (pagination.canGoPrevious || pagination.canGoNext) ? (
        <Pagination
          canGoNext={pagination.canGoNext}
          canGoPrevious={pagination.canGoPrevious}
          isNextPageError={pagination.isNextPageError}
          isNextPageLoading={pagination.isNextPageLoading}
          label={title}
          nextPage={() => void pagination.nextPage()}
          pageNumber={pagination.pageNumber}
          previousPage={pagination.previousPage}
        />
      ) : null}
    </section>
  )
}

export function ArchiveFeatureEntry() {
  return (
    <CollectionFeatureEntry
      emptyMessage="Archive is empty."
      status="archived"
      title="Archive"
    />
  )
}

export function TrashFeatureEntry() {
  return (
    <CollectionFeatureEntry
      emptyMessage="Trash is empty."
      status="trashed"
      title="Trash"
    />
  )
}
