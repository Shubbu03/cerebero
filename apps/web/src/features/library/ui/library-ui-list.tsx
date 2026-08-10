import type { ItemView } from '@cerebero/contracts'

import { LibraryUiListItem } from './library-ui-list-item'

type LibraryUiListProps = {
  items: ItemView[]
  layout?: 'pinned-grid' | 'rows'
}

export function LibraryUiList({ items, layout = 'rows' }: LibraryUiListProps) {
  return (
    <div
      aria-label={layout === 'pinned-grid' ? 'Pinned items' : undefined}
      className={
        layout === 'pinned-grid'
          ? 'mt-6 grid gap-3 md:grid-cols-3'
          : 'mt-6 grid gap-2'
      }
    >
      {items.map((item) => (
        <LibraryUiListItem
          item={item}
          key={item.id}
          layout={layout === 'pinned-grid' ? 'card' : 'row'}
        />
      ))}
    </div>
  )
}
