import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrayIcon,
} from '@phosphor-icons/react'
import { Button, IconButton, Input } from '@cerebero/ui'

import { ThemeControl } from '../app/theme-control'
import { Wordmark } from '../app/wordmark'

/**
 * Capture → Inbox product composition built from real UI primitives.
 * This is the memorable product proof on the landing page—not an illustration.
 */
function ProductPreview() {
  return (
    <section
      aria-label="Cerebero workflow preview"
      className="border-border-strong bg-surface relative border"
    >
      <div className="lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)]">
        <aside className="border-border-subtle hidden border-r lg:block">
          <div className="border-border-subtle border-b px-5 py-4">
            <Wordmark />
          </div>
          <nav
            className="grid gap-0.5 p-3 text-sm"
            aria-label="Preview navigation"
          >
            <div className="border-accent-strong bg-sunken text-primary flex items-center justify-between border-l-2 px-3 py-2.5 font-semibold">
              <span className="flex items-center gap-2">
                <TrayIcon size={18} weight="bold" />
                Inbox
              </span>
              <span className="text-tertiary font-mono text-[0.6875rem]">
                03
              </span>
            </div>
            <div className="text-secondary flex items-center gap-2 px-3 py-2.5">
              <BookOpenIcon size={18} />
              Library
            </div>
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="border-border-subtle flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-tertiary font-mono text-[0.6875rem] tracking-[0.14em] uppercase">
                Inbox · 3 unreviewed
              </p>
              <h2 className="font-display mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                Capture, then review
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton label="Open search">
                <MagnifyingGlassIcon size={18} weight="bold" />
              </IconButton>
              <Button size="compact">
                <PlusIcon size={16} weight="bold" />
                Capture
              </Button>
            </div>
          </header>

          {/* Capture surface — the entry point of the product story */}
          <div className="border-border-subtle bg-sunken border-b px-4 py-4 sm:px-5">
            <p className="text-tertiary font-mono text-[0.6875rem] tracking-[0.14em] uppercase">
              Capture
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="relative">
                <LinkSimpleIcon
                  aria-hidden="true"
                  className="text-tertiary absolute top-1/2 left-3 -translate-y-1/2"
                  size={18}
                />
                <Input
                  aria-label="Link or note preview"
                  className="bg-surface pl-10"
                  placeholder="Paste a link or begin a note…"
                  readOnly
                  defaultValue="https://designsystems.com/calmer-interfaces"
                />
              </div>
              <Button variant="outline">
                Save to Inbox
                <ArrowRightIcon size={16} weight="bold" />
              </Button>
            </div>
          </div>

          {/* Inbox rows — immediate result of capture */}
          <div className="divide-border-subtle divide-y">
            <article className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
              <div className="min-w-0">
                <div className="text-tertiary flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] tracking-wide uppercase">
                  <span
                    className="bg-accent size-1.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>designsystems.com</span>
                  <span aria-hidden="true">·</span>
                  <span>just now</span>
                </div>
                <h3 className="text-primary mt-2 text-[0.9375rem] leading-snug font-semibold sm:text-base">
                  Designing interfaces that become calmer with use
                </h3>
                <p className="text-secondary mt-1 line-clamp-2 max-w-2xl text-sm leading-relaxed">
                  Keep this for progressive organization and quiet defaults.
                </p>
              </div>
              <Button className="justify-self-start sm:justify-self-end" variant="outline">
                <CheckIcon size={16} weight="bold" />
                File
              </Button>
            </article>

            <article className="px-4 py-4 sm:px-5">
              <p className="text-tertiary font-mono text-[0.6875rem] tracking-wide uppercase">
                Note · yesterday
              </p>
              <h3 className="text-primary mt-2 text-[0.9375rem] leading-snug font-semibold sm:text-base">
                Questions for the research review
              </h3>
              <p className="text-secondary mt-1 text-sm leading-relaxed">
                What makes a saved reference useful six months later?
              </p>
            </article>

            <article className="px-4 py-4 sm:px-5">
              <div className="text-tertiary flex flex-wrap items-center gap-x-2 font-mono text-[0.6875rem] tracking-wide uppercase">
                <span>notes.local</span>
                <span aria-hidden="true">·</span>
                <span>2 days ago</span>
              </div>
              <h3 className="text-primary mt-2 text-[0.9375rem] leading-snug font-semibold sm:text-base">
                A short list of books to reread
              </h3>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}

const workflow = [
  {
    number: '01',
    title: 'Capture',
    copy: 'Save a link or note the moment it appears. Enrichment never blocks the thought.',
  },
  {
    number: '02',
    title: 'Review',
    copy: 'The Inbox keeps new material deliberate—file what belongs, leave the rest until later.',
  },
  {
    number: '03',
    title: 'Rediscover',
    copy: 'Search authored meaning first. Tags, pins, and filters stay quiet until you need them.',
  },
] as const

export function LandingRoute() {
  return (
    <main className="bg-canvas text-primary min-h-screen">
      {/* Quiet paper grain — decorative, non-competing, motion-free */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.028] bg-[repeating-linear-gradient(0deg,currentColor_0,currentColor_1px,transparent_1px,transparent_6px)]"
      />

      <header className="border-border-subtle relative border-b">
        <nav
          className="mx-auto flex max-w-360 items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12"
          aria-label="Primary"
        >
          <Wordmark />
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/login"
              className="text-secondary hover:text-primary focus-visible:ring-focus rounded-control px-2 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Sign in
            </a>
            <ThemeControl />
          </div>
        </nav>
      </header>

      <div className="relative mx-auto max-w-360 px-5 sm:px-8 lg:px-12">
        {/* Hero — one headline, one sentence, one primary CTA */}
        <section
          aria-labelledby="landing-headline"
          className="animate-rise-in max-w-4xl pt-16 pb-12 sm:pt-20 sm:pb-14 lg:pt-24 lg:pb-16"
        >
          <h1
            id="landing-headline"
            className="font-display text-[clamp(2.75rem,8vw,5.75rem)] leading-[0.92] font-medium tracking-[-0.04em] text-balance"
          >
            Remember what mattered.
          </h1>
          <p className="text-secondary reading-measure mt-6 text-base leading-7 sm:text-lg sm:leading-8">
            A private place to capture links and notes, review them with care,
            and find them again when they matter.
          </p>
          <div className="mt-8">
            <Button
              onClick={() => {
                window.location.assign('/signup')
              }}
              size="large"
            >
              Start your archive
              <ArrowRightIcon size={18} weight="bold" />
            </Button>
          </div>
        </section>

        {/* Product proof */}
        <div className="animate-rise-in pb-16 [animation-delay:90ms] sm:pb-20 lg:pb-24">
          <ProductPreview />
        </div>
      </div>

      {/* Three compact workflow statements — not a feature grid */}
      <section
        aria-label="How Cerebero works"
        className="border-border-subtle bg-border-subtle relative border-y"
      >
        <div className="mx-auto grid max-w-360 gap-px sm:grid-cols-3">
          {workflow.map((step, index) => (
            <article
              className="bg-canvas animate-rise-in px-5 py-8 sm:px-8 sm:py-10 lg:px-12"
              key={step.number}
              style={{ animationDelay: `${140 + index * 40}ms` }}
            >
              <p className="text-tertiary font-mono text-[0.6875rem] tracking-[0.14em] uppercase">
                {step.number}
              </p>
              <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                {step.title}
              </h2>
              <p className="text-secondary mt-3 max-w-sm text-sm leading-6">
                {step.copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="relative mx-auto flex max-w-360 flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p className="text-tertiary font-mono text-[0.6875rem] tracking-wide uppercase">
          Cerebero
        </p>
        <nav
          className="text-tertiary flex flex-wrap items-center gap-x-5 gap-y-2 text-xs"
          aria-label="Legal"
        >
          <a
            className="hover:text-secondary focus-visible:ring-focus rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
            href="#privacy"
          >
            Privacy
          </a>
          <a
            className="hover:text-secondary focus-visible:ring-focus rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
            href="#terms"
          >
            Terms
          </a>
        </nav>
      </footer>
    </main>
  )
}

/** @deprecated Use LandingRoute — kept for existing imports during rename. */
export const FoundationRoute = LandingRoute
