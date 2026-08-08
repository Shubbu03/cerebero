import type { ItemView } from '@cerebero/contracts'

import { LibraryUiListItem } from './library-ui-list-item'

type LibraryUiListProps = {
  items: ItemView[]
}

export function LibraryUiList({ items }: LibraryUiListProps) {
  return (
    <div className="border-border-subtle mt-10 divide-y border-y">
      {items.map((item) => (
        <LibraryUiListItem item={item} key={item.id} />
      ))}
    </div>
  )
}
