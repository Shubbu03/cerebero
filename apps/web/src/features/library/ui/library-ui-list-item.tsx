import type { ItemView } from '@cerebero/contracts'
import {
  ArrowSquareOutIcon,
  FileTextIcon,
  LinkSimpleIcon,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

type LibraryUiListItemProps = {
  item: ItemView
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

export function LibraryUiListItem({ item }: LibraryUiListItemProps) {
  const excerpt = noteExcerpt(item.noteMarkdown)
  const visibleTags = item.tags.slice(0, 3)
  const hiddenTagCount = item.tags.length - visibleTags.length

  return (
    <article className="duration-fast hover:bg-surface grid gap-4 px-1 py-6 transition-colors sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-5 sm:px-3 sm:py-7">
      <span
        aria-hidden="true"
        className="border-border-subtle bg-sunken text-secondary hidden size-9 place-items-center border sm:grid"
      >
        {item.kind === 'link' ? (
          <LinkSimpleIcon size={18} />
        ) : (
          <FileTextIcon size={18} />
        )}
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-3">
          <h2 className="min-w-0 text-base leading-6 font-semibold [overflow-wrap:anywhere]">
            <Link
              className="hover:text-accent-strong focus-visible:ring-focus rounded-control underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current focus-visible:ring-2 focus-visible:outline-none"
              params={{ itemId: item.id }}
              to="/items/$itemId"
            >
              {item.displayTitle}
            </Link>
          </h2>
          {item.pinnedAt ? (
            <span className="bg-accent text-accent-foreground mt-0.5 shrink-0 rounded-full px-2 py-0.5 font-mono text-[0.625rem] font-medium tracking-[0.08em] uppercase">
              Pinned
            </span>
          ) : null}
        </div>

        <div className="text-tertiary mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {item.originalUrl ? (
            <a
              className="hover:text-primary focus-visible:ring-focus rounded-control inline-flex max-w-full items-center gap-1 underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current focus-visible:ring-2 focus-visible:outline-none"
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
          <p className="text-secondary mt-4 max-w-3xl text-sm leading-6 [overflow-wrap:anywhere]">
            {excerpt}
          </p>
        ) : null}

        {item.tags.length > 0 ? (
          <ul aria-label="Tags" className="mt-4 flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <li
                className="border-border-subtle bg-sunken text-secondary max-w-full rounded-full border px-2 py-0.5 text-xs [overflow-wrap:anywhere]"
                key={tag.id}
              >
                {tag.name}
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

      <p className="text-tertiary font-mono text-[0.6875rem] tracking-[0.04em] sm:text-right">
        <span className="sm:sr-only">Captured </span>
        <time dateTime={item.createdAt}>
          {capturedAtFormatter.format(new Date(item.createdAt))}
        </time>
      </p>
    </article>
  )
}
