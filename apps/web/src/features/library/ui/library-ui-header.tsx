import {
  MagnifyingGlassIcon,
  SlidersHorizontalIcon,
} from '@phosphor-icons/react'
import { Button } from '@cerebero/ui'
import type { Ref } from 'react'

type LibraryUiHeaderProps = {
  activeFilterCount: number
  filterButtonRef: Ref<HTMLButtonElement>
  isFilterOpen: boolean
  isRefreshing: boolean
  onOpenSearch: () => void
  onToggleFilters: () => void
}

export function LibraryUiHeader({
  activeFilterCount,
  filterButtonRef,
  isFilterOpen,
  isRefreshing,
  onOpenSearch,
  onToggleFilters,
}: LibraryUiHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="min-w-0">
        <h1 className="font-display text-[clamp(3.25rem,6vw,5rem)] leading-none font-medium tracking-[-0.05em]">
          Library
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onOpenSearch} variant="outline">
          <MagnifyingGlassIcon aria-hidden="true" size={17} weight="bold" />
          Search
          <kbd
            aria-hidden="true"
            className="text-tertiary ml-1 hidden font-mono text-[0.625rem] sm:inline"
          >
            ⌘K
          </kbd>
        </Button>
        <Button
          aria-expanded={isFilterOpen}
          aria-controls="library-filters"
          aria-haspopup="true"
          onClick={onToggleFilters}
          ref={filterButtonRef}
          variant={isFilterOpen ? 'accent' : 'outline'}
        >
          <SlidersHorizontalIcon aria-hidden="true" size={17} weight="bold" />
          Filters
          {activeFilterCount > 0 ? (
            <span
              aria-label={`${activeFilterCount} active filters`}
              className="bg-primary text-canvas grid size-5 place-items-center rounded-full font-mono text-[0.625rem]"
            >
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      {isRefreshing ? (
        <span className="sr-only" role="status">
          Refreshing Library
        </span>
      ) : null}
    </header>
  )
}
