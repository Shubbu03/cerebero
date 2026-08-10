import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  useCreateTag,
  useDeleteTag,
  useRenameTag,
} from '../tags/data-access/use-tag-mutations'
import { useTagsQuery } from '../tags/data-access/use-tags-query'
import { TagManagementDialog } from '../tags/ui/tag-management-dialog'
import { useSearchDialog } from '../search/search-dialog-context'
import { useCursorPagination } from '../../shared/data-access/use-cursor-pagination'
import { Pagination } from '../../shared/ui/pagination'
import {
  defaultLibraryListFilters,
  LIBRARY_PAGE_SIZE,
  type LibraryListFilters,
} from './data-access/library-items-query-key'
import {
  pinnedLibraryItemsQueryOptions,
  paginatedLibraryItemsQueryOptions,
  useLibraryItemsQuery,
  usePinnedLibraryItemsQuery,
} from './data-access/use-library-items-query'
import { refinePlaceholderItems } from './refine-placeholder-items'
import { LibraryUiEmpty } from './ui/library-ui-empty'
import { LibraryUiError } from './ui/library-ui-error'
import { LibraryUiFilters } from './ui/library-ui-filters'
import { LibraryUiHeader } from './ui/library-ui-header'
import { LibraryUiList } from './ui/library-ui-list'
import { LibraryUiLoading } from './ui/library-ui-loading'

type LibraryFeatureEntryProps = {
  filters?: LibraryListFilters
}

export function LibraryFeatureEntry({
  filters = defaultLibraryListFilters,
}: LibraryFeatureEntryProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const libraryQuery = useLibraryItemsQuery(filters)
  const pinnedLibraryQuery = usePinnedLibraryItemsQuery(filters)
  const tagsQuery = useTagsQuery()
  const createTag = useCreateTag()
  const renameTag = useRenameTag()
  const deleteTag = useDeleteTag()
  const { openSearch } = useSearchDialog()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false)
  const filterContainerRef = useRef<HTMLDivElement>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isFilterOpen) {
      return
    }

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !filterContainerRef.current?.contains(event.target)
      ) {
        setIsFilterOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterOpen(false)
        filterButtonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isFilterOpen])

  const paginationResetKey = JSON.stringify({
    kind: filters.kind ?? null,
    pinned: filters.pinned ?? null,
    sort: filters.sort,
    tag: filters.tag ?? [],
  })
  const pagination = useCursorPagination({
    fetchNextPage: () => libraryQuery.fetchNextPage(),
    hasNextPage: libraryQuery.hasNextPage,
    isFetchNextPageError: libraryQuery.isFetchNextPageError,
    isFetchingNextPage: libraryQuery.isFetchingNextPage,
    pageSize: LIBRARY_PAGE_SIZE,
    pages: libraryQuery.data?.pages,
    resetKey: paginationResetKey,
  })
  const tags = useMemo(() => tagsQuery.data?.tags ?? [], [tagsQuery.data?.tags])
  const pageItems = libraryQuery.isPlaceholderData
    ? refinePlaceholderItems(pagination.items, filters)
    : pagination.items
  const pinnedItems = refinePlaceholderItems(
    pinnedLibraryQuery.data?.pages[0]?.items ?? [],
    { ...filters, pinned: true },
  ).slice(0, 3)
  const promotedPinnedItemIds = new Set(pinnedItems.map((item) => item.id))
  const remainingPageItems = pageItems.filter(
    (item) => !promotedPinnedItemIds.has(item.id),
  )
  const visiblePinnedItems = pagination.pageNumber === 1 ? pinnedItems : []
  const visibleItemCount = visiblePinnedItems.length + remainingPageItems.length

  useEffect(() => {
    if (!isFilterOpen) {
      return
    }

    const latestTags = [...tags]
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
          right.id.localeCompare(left.id),
      )
      .slice(0, 3)

    for (const tag of latestTags) {
      const tagFilters = {
        ...filters,
        tag: [...new Set([...(filters.tag ?? []), tag.id])],
      }
      void queryClient.prefetchInfiniteQuery(
        paginatedLibraryItemsQueryOptions(tagFilters),
      )
      void queryClient.prefetchInfiniteQuery(
        pinnedLibraryItemsQueryOptions({
          ...tagFilters,
          pinned: true,
        }),
      )
    }
  }, [filters, isFilterOpen, queryClient, tags])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.kind) count += 1
    if (filters.tag?.length) count += filters.tag.length
    if (filters.sort !== 'created_desc') count += 1
    return count
  }, [filters])

  const updateFilters = (next: LibraryListFilters) => {
    void navigate({
      search: {
        kind: next.kind,
        pinned:
          next.pinned === undefined
            ? undefined
            : next.pinned
              ? ('true' as const)
              : ('false' as const),
        sort: next.sort,
        tag: next.tag,
      },
      to: '/library',
    })
  }

  return (
    <section className="flex w-full flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="relative" ref={filterContainerRef}>
        <LibraryUiHeader
          activeFilterCount={activeFilterCount}
          filterButtonRef={filterButtonRef}
          isFilterOpen={isFilterOpen}
          isRefreshing={
            libraryQuery.isRefetching && !libraryQuery.isFetchingNextPage
          }
          onOpenSearch={() => {
            setIsFilterOpen(false)
            openSearch()
          }}
          onToggleFilters={() => setIsFilterOpen((current) => !current)}
        />

        {isFilterOpen ? (
          <LibraryUiFilters
            filters={filters}
            onChange={updateFilters}
            onManageTags={() => {
              setIsFilterOpen(false)
              setIsTagManagerOpen(true)
            }}
            tags={tags}
          />
        ) : null}
      </div>

      <TagManagementDialog
        createTag={async (name) => createTag.mutateAsync({ name })}
        deleteTag={async (tagId) => deleteTag.mutateAsync(tagId)}
        isBusy={
          createTag.isPending || renameTag.isPending || deleteTag.isPending
        }
        isOpen={isTagManagerOpen}
        renameTag={async (tagId, name) =>
          renameTag.mutateAsync({ input: { name }, tagId })
        }
        setIsOpen={setIsTagManagerOpen}
        tags={tags}
      />

      {libraryQuery.isPending || pinnedLibraryQuery.isPending ? (
        <LibraryUiLoading />
      ) : null}

      {libraryQuery.isError || pinnedLibraryQuery.isError ? (
        <LibraryUiError
          isRetrying={libraryQuery.isFetching || pinnedLibraryQuery.isFetching}
          retry={() => {
            void libraryQuery.refetch()
            void pinnedLibraryQuery.refetch()
          }}
        />
      ) : null}

      {libraryQuery.isSuccess &&
      pinnedLibraryQuery.isSuccess &&
      visibleItemCount === 0 ? (
        <LibraryUiEmpty
          filtered={activeFilterCount > 0}
          onClearFilters={() => updateFilters(defaultLibraryListFilters)}
        />
      ) : null}

      {libraryQuery.isSuccess &&
      pinnedLibraryQuery.isSuccess &&
      visibleItemCount > 0 ? (
        <>
          {visiblePinnedItems.length > 0 ? (
            <LibraryUiList items={visiblePinnedItems} layout="pinned-grid" />
          ) : null}
          {remainingPageItems.length > 0 ? (
            <LibraryUiList items={remainingPageItems} />
          ) : null}
        </>
      ) : null}

      {libraryQuery.isSuccess &&
      visibleItemCount > 0 &&
      (pagination.canGoPrevious || pagination.canGoNext) ? (
        <Pagination
          canGoNext={pagination.canGoNext}
          canGoPrevious={pagination.canGoPrevious}
          isNextPageError={pagination.isNextPageError}
          isNextPageLoading={pagination.isNextPageLoading}
          label="Library"
          nextPage={() => void pagination.nextPage()}
          pageNumber={pagination.pageNumber}
          previousPage={pagination.previousPage}
        />
      ) : null}
    </section>
  )
}
