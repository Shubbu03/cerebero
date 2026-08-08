import type { ItemView } from '@cerebero/contracts'

import { InboxUiListItem } from './inbox-ui-list-item'

type InboxUiListProps = {
  fileError: { itemId: string; message: string } | null
  fileItem: (item: ItemView) => void
  filingItemId: string | null
  isFiling: boolean
  items: ItemView[]
}

export function InboxUiList({
  fileError,
  fileItem,
  filingItemId,
  isFiling,
  items,
}: InboxUiListProps) {
  return (
    <ol className="border-border-subtle mt-8 border-y sm:mt-10">
      {items.map((item) => (
        <li
          className="border-border-subtle border-b last:border-b-0"
          key={item.id}
        >
          <InboxUiListItem
            fileError={fileError?.itemId === item.id ? fileError.message : null}
            fileItem={() => fileItem(item)}
            isFiling={filingItemId === item.id}
            isFilingDisabled={isFiling}
            item={item}
          />
        </li>
      ))}
    </ol>
  )
}
