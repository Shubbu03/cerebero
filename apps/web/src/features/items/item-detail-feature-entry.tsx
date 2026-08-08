import { itemIdSchema } from '@cerebero/contracts'

import { ItemQueryError } from './data-access/item-query-error'
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

  return (
    <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
      <ItemDetailUiHeader item={itemQuery.data} />
      <ItemDetailUiBody item={itemQuery.data} />
    </section>
  )
}
