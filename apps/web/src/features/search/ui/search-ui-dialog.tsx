import type { ItemView } from '@cerebero/contracts'
import {
  FileTextIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  XIcon,
} from '@phosphor-icons/react'
import * as Dialog from '@radix-ui/react-dialog'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button, IconButton, Input } from '@cerebero/ui'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { useSearchItemsQuery } from '../data-access/use-search-items-query'
import { formatTagName, normalizeTagNameInput } from '../../tags/tag-name'

type SearchUiDialogProps = {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

function useDebouncedValue(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])

  return debouncedValue
}

function sourceLabel(item: ItemView): string {
  if (!item.originalUrl) {
    return 'Note'
  }

  return new URL(item.originalUrl).hostname.replace(/^www\./, '')
}

type SearchResultProps = {
  active: boolean
  close: () => void
  item: ItemView
  onActivate: () => void
  resultRef: (element: HTMLAnchorElement | null) => void
}

function SearchResult({
  active,
  close,
  item,
  onActivate,
  resultRef,
}: SearchResultProps) {
  const ItemIcon = item.kind === 'link' ? LinkSimpleIcon : FileTextIcon

  return (
    <li aria-selected={active} id={`search-result-${item.id}`} role="option">
      <Link
        className={`${active ? 'bg-accent/12 ring-accent-strong ring-1 ring-inset' : ''} hover:bg-sunken focus-visible:ring-focus rounded-surface grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 px-3 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none`}
        onClick={close}
        onMouseEnter={onActivate}
        params={{ itemId: item.id }}
        ref={resultRef}
        to="/items/$itemId"
      >
        <span
          className={`${active ? 'bg-accent text-accent-foreground' : 'bg-surface text-secondary'} rounded-control grid size-9 place-items-center transition-colors`}
        >
          <ItemIcon aria-hidden="true" size={17} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {item.displayTitle}
          </span>
          <span className="text-tertiary mt-0.5 block truncate text-xs">
            {sourceLabel(item)}
            {item.tags[0] ? ` · ${formatTagName(item.tags[0].name)}` : ''}
          </span>
        </span>
      </Link>
    </li>
  )
}

export function SearchUiDialog({ isOpen, setIsOpen }: SearchUiDialogProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const debouncedQuery = useDebouncedValue(query.trim(), 180)
  const isDebouncing = query.trim() !== debouncedQuery
  const isTagSearch = debouncedQuery.startsWith('#')
  const apiQuery = isTagSearch
    ? normalizeTagNameInput(debouncedQuery)
    : debouncedQuery
  const filters = useMemo(
    () =>
      apiQuery
        ? { q: apiQuery, scope: isTagSearch ? ('tags' as const) : undefined }
        : null,
    [apiQuery, isTagSearch],
  )
  const searchQuery = useSearchItemsQuery(isOpen ? filters : null)
  const items = searchQuery.data?.pages.flatMap((page) => page.items) ?? []
  const hasCurrentQuery = Boolean(query.trim() && !isDebouncing && apiQuery)
  const activeIndex =
    items.length === 0 ? 0 : Math.min(selectedIndex, items.length - 1)

  const close = () => setIsOpen(false)

  useEffect(() => {
    resultRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex, items.length])

  const handleResultKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (
      !(event.target instanceof HTMLInputElement) ||
      event.nativeEvent.isComposing ||
      items.length === 0 ||
      !hasCurrentQuery
    ) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex((activeIndex + 1) % items.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((activeIndex - 1 + items.length) % items.length)
      return
    }

    if (event.key === 'Enter') {
      const activeItem = items[activeIndex]
      if (!activeItem) {
        return
      }

      event.preventDefault()
      close()
      void navigate({
        params: { itemId: activeItem.id },
        to: '/items/$itemId',
      })
    }
  }

  return (
    <Dialog.Root onOpenChange={setIsOpen} open={isOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-primary/45 fixed inset-0 z-40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="bg-canvas text-primary border-border-strong shadow-raised rounded-panel fixed top-[12vh] left-1/2 z-50 flex max-h-[min(76dvh,42rem)] w-[min(calc(100vw-2rem),42rem)] -translate-x-1/2 flex-col overflow-hidden border focus:outline-none"
          onKeyDownCapture={handleResultKeys}
        >
          <Dialog.Title className="sr-only">Search your Library</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search titles, notes, URLs, and #tags across your collection.
          </Dialog.Description>

          <div className="relative p-3">
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="text-tertiary pointer-events-none absolute top-1/2 left-6 -translate-y-1/2"
              size={19}
            />
            <Input
              aria-activedescendant={
                items[activeIndex]
                  ? `search-result-${items[activeIndex].id}`
                  : undefined
              }
              aria-controls="search-results"
              aria-expanded={items.length > 0}
              aria-label="Search your Library"
              autoComplete="off"
              autoFocus
              className="bg-sunken h-12 pr-12 pl-11 text-base"
              onChange={(event) => {
                setQuery(event.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Search titles, notes, URLs, and #tags"
              role="combobox"
              value={query}
            />
            <Dialog.Close asChild>
              <IconButton
                className="absolute top-1/2 right-5 -translate-y-1/2"
                label="Close search"
              >
                <XIcon aria-hidden="true" size={18} />
              </IconButton>
            </Dialog.Close>
          </div>

          <div className="min-h-56 overflow-y-auto px-3 pb-3">
            {!query.trim() ? (
              <div className="grid min-h-52 place-items-center px-6 text-center">
                <div>
                  <MagnifyingGlassIcon
                    aria-hidden="true"
                    className="text-tertiary mx-auto"
                    size={28}
                  />
                  <p className="text-secondary mt-3 text-sm">
                    Start typing to search your collection.
                  </p>
                </div>
              </div>
            ) : null}

            {query.trim() && isDebouncing ? (
              <p className="text-tertiary px-3 py-5 text-sm" role="status">
                Searching…
              </p>
            ) : null}

            {hasCurrentQuery && searchQuery.isPending ? (
              <p className="text-tertiary px-3 py-5 text-sm" role="status">
                Searching…
              </p>
            ) : null}

            {hasCurrentQuery && searchQuery.isError ? (
              <div className="bg-danger-soft rounded-surface px-4 py-4">
                <p className="text-danger-strong text-sm" role="alert">
                  Search could not be completed.
                </p>
                <Button
                  className="mt-3"
                  disabled={searchQuery.isFetching}
                  onClick={() => void searchQuery.refetch()}
                  size="compact"
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            ) : null}

            {hasCurrentQuery && searchQuery.isSuccess && items.length === 0 ? (
              <p
                className="text-secondary px-3 py-8 text-center text-sm"
                role="status"
              >
                No results for “{debouncedQuery}”.
              </p>
            ) : null}

            {hasCurrentQuery && items.length > 0 ? (
              <ul
                aria-label="Search results"
                className="grid gap-1"
                id="search-results"
                role="listbox"
              >
                {items.map((item, index) => (
                  <SearchResult
                    active={index === activeIndex}
                    close={close}
                    item={item}
                    key={item.id}
                    onActivate={() => setSelectedIndex(index)}
                    resultRef={(element) => {
                      resultRefs.current[index] = element
                    }}
                  />
                ))}
              </ul>
            ) : null}

            {hasCurrentQuery && searchQuery.hasNextPage ? (
              <div className="px-3 pt-3">
                <Button
                  disabled={searchQuery.isFetchingNextPage}
                  onClick={() => void searchQuery.fetchNextPage()}
                  size="compact"
                  variant="ghost"
                >
                  {searchQuery.isFetchingNextPage
                    ? 'Loading…'
                    : 'Show more results'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="bg-surface text-tertiary flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-[0.6875rem]">
            <span>Search across Library, Archive, and Trash</span>
            <span className="flex flex-wrap items-center gap-3">
              <span>
                <kbd className="font-mono">↑</kbd>{' '}
                <kbd className="font-mono">↓</kbd> navigate
              </span>
              <span>
                <kbd className="font-mono">Enter</kbd> open
              </span>
              <span>
                <kbd className="font-mono">Esc</kbd> close
              </span>
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
