import type { EnrichmentState, ItemView } from '@cerebero/contracts'
import {
  ArrowSquareOutIcon,
  FileTextIcon,
  FolderSimplePlusIcon,
  LinkSimpleIcon,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { Button } from '@cerebero/ui'

type InboxUiListItemProps = {
  fileError: string | null
  fileItem: () => void
  isFiling: boolean
  isFilingDisabled: boolean
  item: ItemView
}

const capturedAtFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
})

const enrichmentLabels: Record<EnrichmentState, string> = {
  pending: 'Fetching details',
  processing: 'Fetching details',
  retryable_failed: 'Details delayed · Item is safe',
  succeeded: 'Details ready',
  terminal_failed: 'No preview available',
}

function getSourceLabel(item: ItemView) {
  if (!item.originalUrl) {
    return 'Note'
  }

  return new URL(item.originalUrl).hostname.replace(/^www\./, '')
}

function getNoteExcerpt(noteMarkdown: string | null) {
  if (!noteMarkdown) {
    return null
  }

  const excerpt = noteMarkdown.replace(/\s+/g, ' ').trim()
  if (excerpt.length <= 180) {
    return excerpt
  }

  return `${excerpt.slice(0, 177)}…`
}

export function InboxUiListItem({
  fileError,
  fileItem,
  isFiling,
  isFilingDisabled,
  item,
}: InboxUiListItemProps) {
  const noteExcerpt = getNoteExcerpt(item.noteMarkdown)
  const visibleTags = item.tags.slice(0, 3)
  const hiddenTagCount = item.tags.length - visibleTags.length

  return (
    <article className="group duration-fast hover:bg-surface grid gap-4 px-1 py-6 transition-colors sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-5 sm:px-3 sm:py-7">
      <span
        className="border-border-subtle bg-sunken text-secondary hidden size-9 place-items-center border sm:grid"
        aria-hidden="true"
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
              <span className="truncate">{getSourceLabel(item)}</span>
              <ArrowSquareOutIcon
                aria-hidden="true"
                className="shrink-0"
                size={13}
              />
              <span className="sr-only">opens in a new tab</span>
            </a>
          ) : (
            <span>{getSourceLabel(item)}</span>
          )}
          {item.enrichment ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{enrichmentLabels[item.enrichment.state]}</span>
            </>
          ) : null}
        </div>

        {noteExcerpt ? (
          <p className="text-secondary mt-4 max-w-3xl text-sm leading-6 [overflow-wrap:anywhere]">
            {noteExcerpt}
          </p>
        ) : item.enrichment?.description ? (
          <p className="text-secondary mt-4 max-w-3xl text-sm leading-6 [overflow-wrap:anywhere]">
            {item.enrichment.description}
          </p>
        ) : null}

        {item.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
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

      <div className="grid content-between justify-items-start gap-4 sm:justify-items-end sm:text-right">
        <p className="text-tertiary font-mono text-[0.6875rem] tracking-[0.04em]">
          <span className="sm:sr-only">Captured </span>
          <time dateTime={item.createdAt}>
            {capturedAtFormatter.format(new Date(item.createdAt))}
          </time>
        </p>
        <div>
          <Button
            disabled={isFilingDisabled}
            onClick={fileItem}
            size="compact"
            variant="outline"
          >
            <FolderSimplePlusIcon aria-hidden="true" size={15} />
            {isFiling ? 'Filing…' : 'File to Library'}
          </Button>
          {fileError ? (
            <p
              className="text-danger-strong mt-2 max-w-56 text-xs leading-5"
              role="alert"
            >
              {fileError}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
