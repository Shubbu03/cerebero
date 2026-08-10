import type { ItemView } from '@cerebero/contracts'
import {
  ArrowSquareOutIcon,
  FileTextIcon,
  LinkSimpleIcon,
  PushPinIcon,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

import { formatTagName } from '../../tags/tag-name'

type LibraryUiListItemProps = {
  item: ItemView & { clientState?: 'saving' }
  layout?: 'card' | 'row'
}

const capturedAtFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
})

function sourceLabel(item: ItemView) {
  if (!item.originalUrl) {
    return 'Note'
  }

  return new URL(item.originalUrl).hostname.replace(/^www\./, '')
}

function noteExcerpt(noteMarkdown: string | null) {
  if (!noteMarkdown) {
    return null
  }

  const excerpt = noteMarkdown.replace(/\s+/g, ' ').trim()
  return excerpt.length <= 180 ? excerpt : `${excerpt.slice(0, 177)}…`
}

export function LibraryUiListItem({
  item,
  layout = 'row',
}: LibraryUiListItemProps) {
  const isSaving = item.clientState === 'saving'
  const isCard = layout === 'card'
  const excerpt = noteExcerpt(item.noteMarkdown)
  const visibleTags = item.tags.slice(0, 3)
  const hiddenTagCount = item.tags.length - visibleTags.length

  return (
    <article
      aria-busy={isSaving || undefined}
      className={`${isSaving ? 'cursor-default' : 'cursor-pointer'} group relative isolate ${
        isCard
          ? 'bg-surface duration-fast hover:bg-raised rounded-surface grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-2.5 gap-y-1.5 p-3 transition-colors'
          : 'duration-fast hover:bg-surface rounded-surface grid gap-4 px-3 py-4 transition-colors sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-4 sm:px-4 sm:py-5'
      }`}
    >
      {isSaving ? null : (
        <Link
          aria-label={`Open ${item.displayTitle}`}
          className="focus-visible:ring-focus rounded-surface absolute inset-0 z-0 cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
          params={{ itemId: item.id }}
          to="/items/$itemId"
        />
      )}

      <span
        aria-hidden="true"
        className={`bg-sunken text-secondary rounded-control pointer-events-none relative z-10 place-items-center ${isCard ? 'grid size-8' : 'hidden size-9 sm:grid'}`}
      >
        {item.kind === 'link' ? (
          <LinkSimpleIcon size={isCard ? 16 : 18} />
        ) : (
          <FileTextIcon size={isCard ? 16 : 18} />
        )}
      </span>

      <div
        className={`relative z-10 min-w-0 ${isSaving ? '' : 'pointer-events-none'}`}
      >
        <div
          className={`flex min-w-0 items-start ${isCard ? 'gap-2' : 'gap-3'}`}
        >
          <h2 className="min-w-0 text-base leading-6 font-semibold [overflow-wrap:anywhere]">
            {item.displayTitle}
          </h2>
          {item.pinnedAt ? (
            <span
              aria-label="Pinned"
              className="text-accent-strong mt-0.5 inline-flex size-5 shrink-0 items-center justify-center"
              role="img"
              title="Pinned"
            >
              <PushPinIcon aria-hidden="true" size={16} weight="fill" />
            </span>
          ) : null}
        </div>

        <div
          className={`text-tertiary flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${isCard ? 'mt-1' : 'mt-1.5'}`}
        >
          {item.originalUrl ? (
            <a
              className="hover:text-primary focus-visible:ring-focus rounded-control pointer-events-auto relative z-20 inline-flex max-w-full cursor-pointer items-center gap-1 underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current focus-visible:ring-2 focus-visible:outline-none"
              href={item.originalUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="truncate">{sourceLabel(item)}</span>
              <ArrowSquareOutIcon aria-hidden="true" size={13} />
              <span className="sr-only">opens in a new tab</span>
            </a>
          ) : (
            <span>{sourceLabel(item)}</span>
          )}
        </div>

        {excerpt ? (
          <p
            className={`text-secondary max-w-3xl text-sm [overflow-wrap:anywhere] ${isCard ? 'mt-2 line-clamp-2 leading-5' : 'mt-4 leading-6'}`}
          >
            {excerpt}
          </p>
        ) : null}

        {item.tags.length > 0 ? (
          <ul
            aria-label="Tags"
            className={`${isCard ? 'mt-2' : 'mt-4'} flex flex-wrap gap-1.5`}
          >
            {visibleTags.map((tag) => (
              <li
                className="border-border-subtle bg-sunken text-secondary max-w-full rounded-full border px-2 py-0.5 text-xs [overflow-wrap:anywhere]"
                key={tag.id}
              >
                {formatTagName(tag.name)}
              </li>
            ))}
            {hiddenTagCount > 0 ? (
              <li className="text-tertiary px-1 py-0.5 text-xs">
                +{hiddenTagCount} more
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <p
        className={`text-tertiary pointer-events-none relative z-10 font-mono text-[0.6875rem] tracking-[0.04em] whitespace-nowrap ${isCard ? 'col-start-3 row-start-1 text-right' : 'sm:text-right'}`}
      >
        {isSaving ? (
          'Saving…'
        ) : (
          <>
            <span className="sm:sr-only">Captured </span>
            <time dateTime={item.createdAt}>
              {capturedAtFormatter.format(new Date(item.createdAt))}
            </time>
          </>
        )}
      </p>
    </article>
  )
}
