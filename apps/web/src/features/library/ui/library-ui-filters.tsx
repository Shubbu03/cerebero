import type { ItemKind, ItemListSort, TagView } from '@cerebero/contracts'
import { CaretDownIcon, TagIcon } from '@phosphor-icons/react'
import { Button } from '@cerebero/ui'
import type { ReactNode } from 'react'

import type { LibraryListFilters } from '../data-access/library-items-query-key'
import { formatTagName } from '../../tags/tag-name'

type LibraryUiFiltersProps = {
  filters: LibraryListFilters
  onChange: (next: LibraryListFilters) => void
  onManageTags: () => void
  tags: TagView[]
}

const sortOptions: { label: string; value: ItemListSort }[] = [
  { label: 'Newest captured', value: 'created_desc' },
  { label: 'Oldest captured', value: 'created_asc' },
  { label: 'Recently updated', value: 'updated_desc' },
  { label: 'Title', value: 'title_asc' },
]

const kindOptions: { label: string; value: ItemKind | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Links', value: 'link' },
  { label: 'Notes', value: 'note' },
]

function withFilters(
  current: LibraryListFilters,
  patch: Partial<LibraryListFilters>,
): LibraryListFilters {
  return {
    kind: 'kind' in patch ? patch.kind : current.kind,
    pinned: undefined,
    sort: patch.sort ?? current.sort,
    tag: 'tag' in patch ? patch.tag : current.tag,
  }
}

function SelectControl({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-medium">
      {label}
      <span className="relative block">
        {children}
        <CaretDownIcon
          aria-hidden="true"
          className="text-secondary pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
          size={15}
          weight="bold"
        />
      </span>
    </label>
  )
}

const selectClasses =
  'border-border-strong bg-canvas text-primary focus-visible:ring-focus h-10 w-full appearance-none rounded-control border px-3 pr-10 text-sm leading-none outline-none focus-visible:ring-2'

export function LibraryUiFilters({
  filters,
  onChange,
  onManageTags,
  tags,
}: LibraryUiFiltersProps) {
  const selectedTags = new Set(filters.tag ?? [])
  const hasActiveFilters =
    filters.kind !== undefined ||
    (filters.tag?.length ?? 0) > 0 ||
    filters.sort !== 'created_desc'
  const latestTags = [...tags]
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        right.id.localeCompare(left.id),
    )
    .slice(0, 3)

  const toggleTag = (tagId: string) => {
    const next = new Set(selectedTags)
    if (next.has(tagId)) {
      next.delete(tagId)
    } else {
      next.add(tagId)
    }
    onChange(
      withFilters(filters, {
        tag: next.size > 0 ? [...next] : undefined,
      }),
    )
  }

  return (
    <section
      aria-label="Library filters"
      className="border-border-strong bg-raised shadow-raised rounded-panel absolute top-[calc(100%+0.75rem)] right-0 z-40 w-[min(26rem,calc(100vw-2rem))] border p-4"
      id="library-filters"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold">Refine your Library</h2>
        {hasActiveFilters ? (
          <Button
            onClick={() => onChange({ sort: 'created_desc' })}
            size="compact"
            variant="ghost"
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SelectControl label="Kind">
          <select
            aria-label="Filter by kind"
            className={selectClasses}
            onChange={(event) => {
              const value = event.target.value as ItemKind | 'all'
              onChange(
                withFilters(filters, {
                  kind: value === 'all' ? undefined : value,
                }),
              )
            }}
            value={filters.kind ?? 'all'}
          >
            {kindOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SelectControl>

        <SelectControl label="Sort">
          <select
            aria-label="Sort Library"
            className={selectClasses}
            onChange={(event) => {
              onChange(
                withFilters(filters, {
                  sort: event.target.value as ItemListSort,
                }),
              )
            }}
            value={filters.sort}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SelectControl>
      </div>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium">Tags</p>
          {latestTags.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {latestTags.map((tag) => {
                const active = selectedTags.has(tag.id)
                return (
                  <li key={tag.id}>
                    <button
                      aria-pressed={active}
                      className={
                        active
                          ? 'bg-accent text-accent-foreground focus-visible:ring-focus rounded-full px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none'
                          : 'bg-canvas text-secondary hover:text-primary focus-visible:ring-focus rounded-full px-2.5 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none'
                      }
                      onClick={() => toggleTag(tag.id)}
                      type="button"
                    >
                      {formatTagName(tag.name)}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-tertiary mt-2 text-xs">No tags yet.</p>
          )}
        </div>

        <Button onClick={onManageTags} size="compact" variant="ghost">
          <TagIcon aria-hidden="true" size={15} />
          Manage tags
        </Button>
      </div>
    </section>
  )
}
