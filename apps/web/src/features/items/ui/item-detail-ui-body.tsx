import type { ItemView } from '@cerebero/contracts'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { MarkdownContent } from '../../markdown/markdown-content'

type ItemDetailUiBodyProps = {
  item: ItemView
  tagsEditor?: ReactNode
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function ItemDate({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-tertiary font-mono text-xs">{label}</dt>
      <dd className="mt-1.5 text-sm">
        <time dateTime={value}>
          {dateTimeFormatter.format(new Date(value))}
        </time>
      </dd>
    </div>
  )
}

export function ItemDetailUiBody({ item, tagsEditor }: ItemDetailUiBodyProps) {
  return (
    <div className="py-6 sm:py-7">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] lg:items-start lg:gap-8">
        <section aria-labelledby="item-source-title" className="min-w-0">
          <h2
            className="text-tertiary font-mono text-xs"
            id="item-source-title"
          >
            Source
          </h2>
          {item.originalUrl ? (
            <a
              className="text-accent-strong hover:text-primary focus-visible:ring-focus rounded-control mt-2.5 inline-flex max-w-full items-start gap-2 text-sm font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
              href={item.originalUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="break-all">{item.originalUrl}</span>
              <ArrowSquareOutIcon
                aria-hidden="true"
                className="mt-0.5 shrink-0"
                size={16}
              />
              <span className="sr-only">opens in a new tab</span>
            </a>
          ) : (
            <p className="text-tertiary mt-2.5 text-sm">No source URL.</p>
          )}
        </section>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <ItemDate label="Captured" value={item.createdAt} />
          <ItemDate label="Updated" value={item.updatedAt} />
          {item.pinnedAt ? (
            <ItemDate label="Pinned" value={item.pinnedAt} />
          ) : null}
        </dl>
      </div>

      <div className="border-border-subtle mt-7 grid gap-7 border-t pt-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(22rem,1fr)] xl:gap-8">
        <section aria-labelledby="item-note-title" className="min-w-0">
          <h2 className="text-tertiary font-mono text-xs" id="item-note-title">
            Note
          </h2>
          {item.noteMarkdown ? (
            <div className="mt-3 max-w-4xl">
              <MarkdownContent>{item.noteMarkdown}</MarkdownContent>
            </div>
          ) : (
            <p className="text-tertiary mt-3 text-sm">No note was added.</p>
          )}
        </section>

        {tagsEditor ? (
          <aside aria-label="Item organization and sharing" className="min-w-0">
            {tagsEditor}
          </aside>
        ) : null}
      </div>
    </div>
  )
}
