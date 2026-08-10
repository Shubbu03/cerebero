import type { ItemView } from '@cerebero/contracts'

import type { LibraryListFilters } from './data-access/library-items-query-key'

function compareDates(left: string, right: string) {
  return Date.parse(left) - Date.parse(right)
}

export function refinePlaceholderItems(
  items: ItemView[],
  filters: LibraryListFilters,
): ItemView[] {
  const selectedTagIds = filters.tag ?? []
  const matchingItems = items.filter(
    (item) =>
      (!filters.kind || item.kind === filters.kind) &&
      (filters.pinned === undefined ||
        Boolean(item.pinnedAt) === filters.pinned) &&
      selectedTagIds.every((tagId) =>
        item.tags.some((tag) => tag.id === tagId),
      ),
  )

  return matchingItems.toSorted((left, right) => {
    switch (filters.sort) {
      case 'created_asc':
        return compareDates(left.createdAt, right.createdAt)
      case 'updated_desc':
        return compareDates(right.updatedAt, left.updatedAt)
      case 'title_asc':
        return left.displayTitle.localeCompare(right.displayTitle)
      case 'created_desc':
        return compareDates(right.createdAt, left.createdAt)
    }
  })
}
