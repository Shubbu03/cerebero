import type { ItemView } from '@cerebero/contracts'
import { useState } from 'react'

import { useFileItem } from '../items/data-access/use-file-item'
import { useInboxItemsQuery } from './data-access/use-inbox-items-query'
import { InboxUiEmpty } from './ui/inbox-ui-empty'
import { InboxUiError } from './ui/inbox-ui-error'
import { InboxUiHeader } from './ui/inbox-ui-header'
import { InboxUiList } from './ui/inbox-ui-list'
import { InboxUiLoading } from './ui/inbox-ui-loading'
import { InboxUiPagination } from './ui/inbox-ui-pagination'

export function InboxFeatureEntry() {
  const inboxQuery = useInboxItemsQuery()
  const fileMutation = useFileItem()
  const [fileError, setFileError] = useState<{
    itemId: string
    message: string
  } | null>(null)
  const items = inboxQuery.data?.pages.flatMap((page) => page.items) ?? []

  const fileItem = async (item: ItemView) => {
    setFileError(null)
    try {
      await fileMutation.mutateAsync({
        itemId: item.id,
        version: item.version,
      })
    } catch (error) {
      setFileError({
        itemId: item.id,
        message:
          error instanceof Error
            ? error.message
            : 'The Item could not be filed. Refresh and try again.',
      })
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <InboxUiHeader
        hasMoreItems={inboxQuery.hasNextPage}
        isRefreshing={inboxQuery.isRefetching && !inboxQuery.isFetchingNextPage}
        itemCount={inboxQuery.isPending ? null : items.length}
      />

      {inboxQuery.isPending ? <InboxUiLoading /> : null}

      {inboxQuery.isError ? (
        <InboxUiError
          isRetrying={inboxQuery.isFetching}
          retry={() => void inboxQuery.refetch()}
        />
      ) : null}

      {inboxQuery.isSuccess && items.length === 0 ? <InboxUiEmpty /> : null}

      {inboxQuery.isSuccess && items.length > 0 ? (
        <>
          <InboxUiList
            fileError={fileError}
            fileItem={(item) => void fileItem(item)}
            filingItemId={
              fileMutation.isPending ? fileMutation.variables.itemId : null
            }
            isFiling={fileMutation.isPending}
            items={items}
          />
          <InboxUiPagination
            hasMoreItems={inboxQuery.hasNextPage}
            isError={inboxQuery.isFetchNextPageError}
            isLoading={inboxQuery.isFetchingNextPage}
            loadMore={() => void inboxQuery.fetchNextPage()}
          />
        </>
      ) : null}
    </section>
  )
}
