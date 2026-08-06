import {
  ArrowRight,
  BookOpen,
  Check,
  Command,
  LinkSimple,
  MagnifyingGlass,
  Plus,
  Tray,
} from '@phosphor-icons/react'
import { Button, IconButton, Input } from '@cerebero/ui'

import { ThemeControl } from '../app/theme-control'
import { Wordmark } from '../app/wordmark'

function ProductFragment() {
  return (
    <section
      aria-label="Cerebero workflow preview"
      className="border-border-subtle bg-surface relative border-y lg:grid lg:grid-cols-[13rem_minmax(0,1fr)]"
    >
      <aside className="border-border-subtle hidden border-r p-5 lg:block">
        <Wordmark />
        <nav
          className="mt-10 grid gap-1 text-sm"
          aria-label="Preview navigation"
        >
          <div className="border-accent-strong bg-sunken text-primary flex items-center justify-between border-l-2 px-3 py-2.5 font-semibold">
            <span className="flex items-center gap-2">
              <Tray size={18} weight="bold" /> Inbox
            </span>
            <span className="text-tertiary font-mono text-xs">03</span>
          </div>
          <div className="text-secondary flex items-center gap-2 px-3 py-2.5">
            <BookOpen size={18} /> Library
          </div>
        </nav>
        <p className="border-border-subtle text-tertiary mt-12 border-t pt-4 font-mono text-[0.6875rem] leading-relaxed tracking-wide uppercase">
          A quiet place for things worth returning to.
        </p>
      </aside>

      <div className="min-w-0">
        <header className="border-border-subtle flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <div>
            <p className="text-tertiary font-mono text-[0.6875rem] tracking-[0.16em] uppercase">
              Thursday · 3 unreviewed
            </p>
            <h2 className="font-display mt-1 text-3xl font-semibold">Inbox</h2>
          </div>
          <div className="flex items-center gap-1">
            <IconButton label="Open search">
              <MagnifyingGlass size={19} weight="bold" />
            </IconButton>
            <Button size="compact">
              <Plus size={16} weight="bold" /> Capture
            </Button>
          </div>
        </header>

        <div className="border-border-subtle bg-sunken/55 border-b p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <LinkSimple
                aria-hidden="true"
                className="text-tertiary absolute top-1/2 left-3 -translate-y-1/2"
                size={18}
              />
              <Input
                aria-label="Link or note preview"
                className="bg-surface pl-10"
                placeholder="Paste a link or begin a note…"
                readOnly
              />
            </div>
            <Button variant="outline">
              Save to Inbox <ArrowRight size={16} weight="bold" />
            </Button>
          </div>
          <p className="text-tertiary mt-2 flex items-center gap-1.5 text-xs">
            <Command size={14} /> Capture stays available from anywhere.
          </p>
        </div>

        <div className="divide-border-subtle divide-y px-4 sm:px-6">
          <article className="group grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="text-tertiary flex items-center gap-2 text-xs">
                <span className="bg-accent size-2" aria-hidden="true" />
                designsystems.com
                <span aria-hidden="true">·</span>
                just now
              </div>
              <h3 className="text-primary mt-2 text-base font-semibold">
                Designing interfaces that become calmer with use
              </h3>
              <p className="text-secondary mt-1 line-clamp-2 max-w-2xl text-sm leading-relaxed">
                Keep this for the section on progressive organization and quiet
                defaults.
              </p>
            </div>
            <Button variant="outline">
              <Check size={16} weight="bold" /> File
            </Button>
          </article>

          <article className="py-5">
            <p className="text-tertiary font-mono text-xs">NOTE · YESTERDAY</p>
            <h3 className="text-primary mt-2 text-base font-semibold">
              Questions for the research review
            </h3>
            <p className="text-secondary mt-1 text-sm leading-relaxed">
              What makes a saved reference useful six months later?
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}

export function FoundationRoute() {
  return (
    <main className="bg-canvas text-primary min-h-screen overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 [background-image:repeating-linear-gradient(0deg,currentColor_0,currentColor_1px,transparent_1px,transparent_5px)] opacity-[0.035]"
      />

      <nav className="relative mx-auto flex max-w-[90rem] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Wordmark />
        <ThemeControl />
      </nav>

      <section className="relative mx-auto max-w-[90rem] px-5 pt-16 pb-14 sm:px-8 sm:pt-24 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:items-end lg:gap-16 lg:px-12 lg:pt-28 lg:pb-20">
        <div className="animate-rise-in">
          <p className="text-accent-strong font-mono text-xs font-medium tracking-[0.18em] uppercase">
            Your private knowledge inbox
          </p>
          <h1 className="font-display mt-5 max-w-5xl text-[clamp(3.2rem,9vw,8rem)] leading-[0.88] font-medium tracking-[-0.055em] text-balance">
            Remember what mattered.
          </h1>
        </div>
        <div className="animate-rise-in border-border-strong mt-10 border-l pl-5 [animation-delay:100ms] lg:mt-0">
          <p className="text-secondary max-w-md text-base leading-7 sm:text-lg">
            Capture links and notes immediately. Understand why they mattered.
            Find them again without maintaining a filing cabinet.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => window.location.assign('/signup')}
              size="large"
            >
              Start your archive <ArrowRight size={18} weight="bold" />
            </Button>
            <span className="text-tertiary text-xs">Private by default</span>
          </div>
        </div>
      </section>

      <div className="relative mx-auto max-w-[90rem] px-0 pb-16 sm:px-8 lg:px-12 lg:pb-24">
        <ProductFragment />
      </div>

      <section className="border-border-subtle bg-border-subtle relative mx-auto grid max-w-[90rem] gap-px border-y sm:grid-cols-3">
        {[
          ['01', 'Capture', 'Save first. Enrichment never blocks the thought.'],
          [
            '02',
            'Review',
            'The Inbox keeps new knowledge deliberate, not chaotic.',
          ],
          [
            '03',
            'Rediscover',
            'Search authored meaning before machine-derived metadata.',
          ],
        ].map(([number, title, copy]) => (
          <article
            className="bg-canvas px-6 py-8 sm:px-8 lg:px-12"
            key={number}
          >
            <p className="text-tertiary font-mono text-xs">{number}</p>
            <h2 className="font-display mt-4 text-3xl font-semibold">
              {title}
            </h2>
            <p className="text-secondary mt-3 max-w-sm text-sm leading-6">
              {copy}
            </p>
          </article>
        ))}
      </section>
    </main>
  )
}
