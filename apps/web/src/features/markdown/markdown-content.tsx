import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'

type MarkdownContentProps = {
  children: string
  emptyMessage?: string
}

function safeUrlTransform(value: string): string {
  const transformed = defaultUrlTransform(value)

  if (
    transformed.startsWith('#') ||
    /^https?:\/\//i.test(transformed) ||
    /^mailto:/i.test(transformed)
  ) {
    return transformed
  }

  return ''
}

export function MarkdownContent({
  children,
  emptyMessage = 'Nothing to preview yet.',
}: MarkdownContentProps) {
  if (!children.trim()) {
    return <p className="text-tertiary text-sm">{emptyMessage}</p>
  }

  return (
    <div className="max-w-none text-base leading-8 wrap-anywhere">
      <ReactMarkdown
        skipHtml
        urlTransform={safeUrlTransform}
        components={{
          a: ({ children: linkChildren, href }) => {
            if (!href) {
              return <span>{linkChildren}</span>
            }

            const opensNewTab = !href.startsWith('#')
            return (
              <a
                className="text-accent-strong hover:text-primary focus-visible:ring-focus rounded-control inline-flex items-baseline gap-1 font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
                href={href}
                rel={opensNewTab ? 'noopener noreferrer nofollow' : undefined}
                target={opensNewTab ? '_blank' : undefined}
              >
                <span>{linkChildren}</span>
                {opensNewTab ? (
                  <>
                    <ArrowSquareOutIcon
                      aria-hidden="true"
                      className="shrink-0"
                      size={14}
                    />
                    <span className="sr-only">opens in a new tab</span>
                  </>
                ) : null}
              </a>
            )
          },
          blockquote: ({ children: quoteChildren }) => (
            <blockquote className="border-accent-strong text-secondary my-5 border-l-2 pl-4 italic">
              {quoteChildren}
            </blockquote>
          ),
          code: ({ children: codeChildren, className }) => (
            <code
              className={`${className ?? ''} bg-sunken rounded-control px-1.5 py-0.5 font-mono text-[0.875em]`}
            >
              {codeChildren}
            </code>
          ),
          h1: ({ children: headingChildren }) => (
            <h2 className="font-display mt-8 mb-3 text-3xl font-semibold tracking-tight first:mt-0">
              {headingChildren}
            </h2>
          ),
          h2: ({ children: headingChildren }) => (
            <h3 className="font-display mt-7 mb-3 text-2xl font-semibold tracking-tight first:mt-0">
              {headingChildren}
            </h3>
          ),
          h3: ({ children: headingChildren }) => (
            <h4 className="mt-6 mb-2 text-lg font-semibold first:mt-0">
              {headingChildren}
            </h4>
          ),
          hr: () => <hr className="border-border-subtle my-7" />,
          img: ({ alt }) => (
            <span className="text-tertiary text-sm">
              {alt ? `[Image omitted: ${alt}]` : '[Image omitted]'}
            </span>
          ),
          li: ({ children: listItemChildren }) => (
            <li className="pl-1">{listItemChildren}</li>
          ),
          ol: ({ children: listChildren }) => (
            <ol className="my-4 ml-6 list-decimal space-y-1">{listChildren}</ol>
          ),
          p: ({ children: paragraphChildren }) => (
            <p className="my-4 first:mt-0 last:mb-0">{paragraphChildren}</p>
          ),
          pre: ({ children: preChildren }) => (
            <pre className="bg-sunken border-border-subtle my-5 overflow-x-auto border p-4 text-sm leading-6">
              {preChildren}
            </pre>
          ),
          strong: ({ children: strongChildren }) => (
            <strong className="font-semibold">{strongChildren}</strong>
          ),
          ul: ({ children: listChildren }) => (
            <ul className="my-4 ml-6 list-disc space-y-1">{listChildren}</ul>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
