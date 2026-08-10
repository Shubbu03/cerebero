import type { PublicSharedItem } from '@cerebero/contracts'
import { shareTokenSchema } from '@cerebero/contracts'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'

import { Wordmark } from '../../app/wordmark'
import { MarkdownContent } from '../markdown/markdown-content'
import { readPublicSharedItem } from './data-access/use-item-share'

type PublicSharedFeatureEntryProps = {
  token: string
}

function PublicSharedUnavailable() {
  return (
    <main className="bg-canvas text-primary grid min-h-dvh place-items-center px-5">
      <div className="max-w-md text-center">
        <div className="flex justify-center">
          <Wordmark />
        </div>
        <h1 className="font-display mt-8 text-4xl font-semibold tracking-tight">
          This shared Item is unavailable.
        </h1>
        <p className="text-secondary mt-3 text-sm leading-6">
          The link may be invalid, revoked, or no longer public.
        </p>
        <Link
          className="text-accent-strong focus-visible:ring-focus mt-6 inline-flex text-sm font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          to="/"
        >
          Home
        </Link>
      </div>
    </main>
  )
}

function PublicSharedBody({ item }: { item: PublicSharedItem }) {
  return (
    <main className="bg-canvas text-primary min-h-dvh">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <Wordmark />
        <p className="text-tertiary mt-8 font-mono text-xs">
          Shared {item.kind}
        </p>
        <h1 className="font-display mt-3 text-[clamp(2.5rem,7vw,4.5rem)] leading-[0.96] font-medium tracking-[-0.04em] wrap-anywhere">
          {item.displayTitle}
        </h1>

        {item.originalUrl ? (
          <section className="mt-10" aria-labelledby="shared-source-title">
            <h2
              className="text-tertiary font-mono text-xs"
              id="shared-source-title"
            >
              Source
            </h2>
            <a
              className="text-accent-strong focus-visible:ring-focus mt-3 inline-flex max-w-full items-center gap-2 text-sm font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
              href={item.originalUrl}
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              <span className="truncate">{item.originalUrl}</span>
              <ArrowSquareOutIcon aria-hidden="true" size={16} />
              <span className="sr-only">opens in a new tab</span>
            </a>
          </section>
        ) : null}

        <section className="mt-10" aria-labelledby="shared-note-title">
          <h2
            className="text-tertiary font-mono text-xs"
            id="shared-note-title"
          >
            Note
          </h2>
          {item.noteMarkdown ? (
            <div className="mt-4">
              <MarkdownContent>{item.noteMarkdown}</MarkdownContent>
            </div>
          ) : (
            <p className="text-tertiary mt-4 text-sm">No note was shared.</p>
          )}
        </section>
      </div>
    </main>
  )
}

export function PublicSharedFeatureEntry({
  token,
}: PublicSharedFeatureEntryProps) {
  const parsed = shareTokenSchema.safeParse(token)
  const query = useQuery({
    enabled: parsed.success,
    queryFn: () => readPublicSharedItem(parsed.success ? parsed.data : token),
    queryKey: ['public-share', token],
    retry: false,
  })

  useEffect(() => {
    document
      .querySelector('meta[name="robots"]')
      ?.setAttribute('content', 'noindex, nofollow')
    if (!document.querySelector('meta[name="robots"]')) {
      const meta = document.createElement('meta')
      meta.name = 'robots'
      meta.content = 'noindex, nofollow'
      document.head.append(meta)
    }
  }, [])

  if (!parsed.success) {
    return <PublicSharedUnavailable />
  }

  if (query.isPending) {
    return (
      <main className="bg-canvas text-primary grid min-h-dvh place-items-center px-5">
        <p className="text-secondary text-sm" aria-busy="true">
          Opening shared Item…
        </p>
      </main>
    )
  }

  if (query.isError || !query.data) {
    return <PublicSharedUnavailable />
  }

  return <PublicSharedBody item={query.data} />
}
