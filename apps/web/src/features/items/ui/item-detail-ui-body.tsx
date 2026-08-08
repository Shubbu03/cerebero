import type { EnrichmentState, ItemView } from '@cerebero/contracts'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'

type ItemDetailUiBodyProps = {
  item: ItemView
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const enrichmentMessages: Record<EnrichmentState, string> = {
  pending: 'Source details are waiting to be fetched.',
  processing: 'Source details are being fetched.',
  retryable_failed: 'Source details are delayed. Your Item is safe.',
  succeeded: 'Source details are ready.',
  terminal_failed: 'No source preview is available. Your Item is safe.',
}

export function ItemDetailUiBody({ item }: ItemDetailUiBodyProps) {
  return (
    <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
      <article className="min-w-0">
        {item.originalUrl ? (
          <section aria-labelledby="item-source-title">
            <h2
              className="text-tertiary font-mono text-xs tracking-[0.16em] uppercase"
              id="item-source-title"
            >
              Source
            </h2>
            <a
              className="text-accent-strong hover:text-primary focus-visible:ring-focus rounded-control mt-3 inline-flex max-w-full items-center gap-2 text-sm font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
              href={item.originalUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="truncate">{item.originalUrl}</span>
              <ArrowSquareOutIcon
                aria-hidden="true"
                className="shrink-0"
                size={16}
              />
              <span className="sr-only">opens in a new tab</span>
            </a>
          </section>
        ) : null}

        <section
          className={item.originalUrl ? 'mt-10' : undefined}
          aria-labelledby="item-note-title"
        >
          <h2
            className="text-tertiary font-mono text-xs tracking-[0.16em] uppercase"
            id="item-note-title"
          >
            Note
          </h2>
          {item.noteMarkdown ? (
            <p className="mt-4 max-w-3xl text-base leading-8 [overflow-wrap:anywhere] whitespace-pre-wrap">
              {item.noteMarkdown}
            </p>
          ) : (
            <p className="text-tertiary mt-4 text-sm">No note was added.</p>
          )}
        </section>

        {item.enrichment?.state === 'succeeded' &&
        (item.enrichment.extractedTitle || item.enrichment.description) ? (
          <section
            className="border-border-subtle mt-10 border-t pt-8"
            aria-labelledby="source-details-title"
          >
            <h2
              className="text-tertiary font-mono text-xs tracking-[0.16em] uppercase"
              id="source-details-title"
            >
              Derived source details
            </h2>
            {item.enrichment.extractedTitle ? (
              <p className="mt-4 font-semibold [overflow-wrap:anywhere]">
                {item.enrichment.extractedTitle}
              </p>
            ) : null}
            {item.enrichment.description ? (
              <p className="text-secondary mt-2 max-w-3xl text-sm leading-6 [overflow-wrap:anywhere]">
                {item.enrichment.description}
              </p>
            ) : null}
          </section>
        ) : null}
      </article>

      <aside
        className="border-border-subtle border-t pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7"
        aria-label="Item metadata"
      >
        <dl className="grid gap-5 text-sm">
          <div>
            <dt className="text-tertiary text-xs">Captured</dt>
            <dd className="mt-1">
              <time dateTime={item.createdAt}>
                {dateTimeFormatter.format(new Date(item.createdAt))}
              </time>
            </dd>
          </div>
          <div>
            <dt className="text-tertiary text-xs">Updated</dt>
            <dd className="mt-1">
              <time dateTime={item.updatedAt}>
                {dateTimeFormatter.format(new Date(item.updatedAt))}
              </time>
            </dd>
          </div>
          {item.enrichment ? (
            <div>
              <dt className="text-tertiary text-xs">Enrichment</dt>
              <dd className="text-secondary mt-1 leading-5">
                {enrichmentMessages[item.enrichment.state]}
              </dd>
            </div>
          ) : null}
        </dl>

        <section
          className="border-border-subtle mt-7 border-t pt-6"
          aria-labelledby="item-tags-title"
        >
          <h2 className="text-tertiary text-xs" id="item-tags-title">
            Tags
          </h2>
          {item.tags.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <li
                  className="border-border-subtle bg-sunken text-secondary max-w-full rounded-full border px-2 py-0.5 text-xs [overflow-wrap:anywhere]"
                  key={tag.id}
                >
                  {tag.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-tertiary mt-2 text-sm">No Tags</p>
          )}
        </section>
      </aside>
    </div>
  )
}
