import type { ItemPage, ItemView } from '@cerebero/contracts'
import type { InfiniteData, QueryClient } from '@tanstack/react-query'

import { collectionItemsQueryKey } from '../../collections/data-access/use-collection-items-query'
import { libraryItemsQueryRoot } from '../../library/data-access/library-items-query-key'
import { itemQueryKey } from './item-query-key'

function mapItemInPages(
  current: InfiniteData<ItemPage> | undefined,
  itemId: string,
  map: (item: ItemView) => ItemView | null,
): InfiniteData<ItemPage> | undefined {
  if (!current) {
    return current
  }

  let changed = false
  const pages = current.pages.map((page) => {
    let pageChanged = false
    const items: ItemView[] = []
    for (const item of page.items) {
      if (item.id !== itemId) {
        items.push(item)
        continue
      }

      pageChanged = true
      const next = map(item)
      if (next) {
        items.push(next)
      }
    }

    if (!pageChanged) {
      return page
    }

    changed = true
    return { ...page, items }
  })

  return changed ? { ...current, pages } : current
}

function prependToCollection(
  current: InfiniteData<ItemPage> | undefined,
  item: ItemView,
): InfiniteData<ItemPage> | undefined {
  if (!current) {
    return current
  }
  if (
    current.pages.some((page) => page.items.some(({ id }) => id === item.id))
  ) {
    return mapItemInPages(current, item.id, () => item)
  }
  const [firstPage, ...rest] = current.pages
  if (!firstPage) {
    return current
  }
  return {
    ...current,
    pages: [{ ...firstPage, items: [item, ...firstPage.items] }, ...rest],
  }
}

export function writeItemCaches(queryClient: QueryClient, item: ItemView) {
  queryClient.setQueryData(itemQueryKey(item.id), item)

  queryClient.setQueriesData<InfiniteData<ItemPage>>(
    { queryKey: libraryItemsQueryRoot },
    (current) => {
      if (item.status !== 'library') {
        return mapItemInPages(current, item.id, () => null)
      }
      return mapItemInPages(current, item.id, () => item)
    },
  )

  queryClient.setQueryData<InfiniteData<ItemPage>>(
    collectionItemsQueryKey('archived'),
    (current) => {
      if (item.status === 'archived') {
        return prependToCollection(current, item)
      }
      return mapItemInPages(current, item.id, () => null)
    },
  )

  queryClient.setQueryData<InfiniteData<ItemPage>>(
    collectionItemsQueryKey('trashed'),
    (current) => {
      if (item.status === 'trashed') {
        return prependToCollection(current, item)
      }
      return mapItemInPages(current, item.id, () => null)
    },
  )
}

export function removeItemFromAllItemLists(
  queryClient: QueryClient,
  itemId: string,
) {
  queryClient.setQueriesData<InfiniteData<ItemPage>>(
    { queryKey: libraryItemsQueryRoot },
    (current) => mapItemInPages(current, itemId, () => null),
  )
  queryClient.setQueryData<InfiniteData<ItemPage>>(
    collectionItemsQueryKey('archived'),
    (current) => mapItemInPages(current, itemId, () => null),
  )
  queryClient.setQueryData<InfiniteData<ItemPage>>(
    collectionItemsQueryKey('trashed'),
    (current) => mapItemInPages(current, itemId, () => null),
  )
}

export function removeItemFromLibraryCaches(
  queryClient: QueryClient,
  itemId: string,
) {
  queryClient.setQueriesData<InfiniteData<ItemPage>>(
    { queryKey: libraryItemsQueryRoot },
    (current) => mapItemInPages(current, itemId, () => null),
  )
}

export function invalidateLibraryItemLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: libraryItemsQueryRoot,
    refetchType: 'none',
  })
  void queryClient.invalidateQueries({
    queryKey: ['items', 'collection'],
    refetchType: 'none',
  })
  void queryClient.invalidateQueries({
    queryKey: ['search'],
    refetchType: 'none',
  })
}
