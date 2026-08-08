import { itemIdSchema, type ItemView } from '@cerebero/contracts'
import { useState } from 'react'

import { ItemQueryError } from './data-access/item-query-error'
import { useFileItem } from './data-access/use-file-item'
import { useItemQuery } from './data-access/use-item-query'
import { ItemDetailUiBody } from './ui/item-detail-ui-body'
import { ItemDetailUiHeader } from './ui/item-detail-ui-header'
import { ItemDetailUiLoading } from './ui/item-detail-ui-loading'
import { ItemDetailUiUnavailable } from './ui/item-detail-ui-unavailable'

type ItemDetailFeatureEntryProps = {
  itemId: string
}

export function ItemDetailFeatureEntry({
  itemId,
}: ItemDetailFeatureEntryProps) {
  const parsedItemId = itemIdSchema.safeParse(itemId)
  if (!parsedItemId.success) {
    return <ItemDetailUiUnavailable canRetry={false} />
  }

  return (
    <ItemDetailFeatureItem itemId={parsedItemId.data} key={parsedItemId.data} />
  )
}

function ItemDetailFeatureItem({ itemId }: { itemId: string }) {
  const itemQuery = useItemQuery(itemId)
  const fileMutation = useFileItem()
  const [actionError, setActionError] = useState<string | null>(null)
  const [filed, setFiled] = useState(false)

  if (itemQuery.isPending) {
    return <ItemDetailUiLoading />
  }

  if (itemQuery.isError) {
    const canRetry =
      itemQuery.error instanceof ItemQueryError &&
      itemQuery.error.code !== 'not_found'

    return (
      <ItemDetailUiUnavailable
        canRetry={canRetry}
        isRetrying={itemQuery.isFetching}
        retry={() => void itemQuery.refetch()}
      />
    )
  }

  const fileItem = async (item: ItemView) => {
    setActionError(null)
    try {
      await fileMutation.mutateAsync({
        itemId: item.id,
        version: item.version,
      })
      setFiled(true)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'The Item could not be filed. Refresh and try again.',
      )
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
      <ItemDetailUiHeader
        actionError={actionError}
        fileItem={() => void fileItem(itemQuery.data)}
        filed={filed}
        isFiling={fileMutation.isPending}
        item={itemQuery.data}
      />
      <ItemDetailUiBody item={itemQuery.data} />
    </section>
  )
}
