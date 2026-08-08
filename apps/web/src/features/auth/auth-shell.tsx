import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

import { Wordmark } from '../../app/wordmark'

type AuthShellProps = {
  children: ReactNode
  eyebrow: string
  title: string
}

export function AuthShell({ children, eyebrow, title }: AuthShellProps) {
  return (
    <main className="bg-canvas text-primary min-h-screen lg:grid lg:grid-cols-[minmax(0,0.86fr)_minmax(34rem,1.14fr)]">
      <section className="relative flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-12 lg:py-8">
        <Link
          className="focus-visible:ring-focus rounded-control w-fit focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          to="/"
        >
          <Wordmark />
        </Link>

        <div className="my-auto w-full max-w-md py-14 sm:mx-auto lg:mx-0">
          <p className="text-accent-strong font-mono text-xs font-medium tracking-[0.18em] uppercase">
            {eyebrow}
          </p>
          <h1 className="font-display mt-4 text-5xl leading-[0.95] font-semibold tracking-[-0.035em] text-balance sm:text-6xl">
            {title}
          </h1>
          <div className="mt-9">{children}</div>
        </div>

        <p className="text-tertiary text-xs">
          Private by default. Your collection belongs only to you.
        </p>
      </section>

      <aside className="bg-primary text-canvas relative hidden overflow-hidden lg:flex lg:min-h-screen lg:flex-col lg:justify-end lg:p-14">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,currentColor_1px,transparent_1px),linear-gradient(currentColor_1px,transparent_1px)] opacity-[0.08]"
        />
        <div className="relative max-w-2xl">
          <p className="text-accent font-mono text-xs tracking-[0.18em] uppercase">
            Capture → Library
          </p>
          <blockquote className="font-display mt-6 text-5xl leading-[1.02] tracking-[-0.03em]">
            “A collection becomes useful when remembering feels easier than
            filing.”
          </blockquote>
          <div className="border-accent mt-12 w-24 border-t-4" />
        </div>
      </aside>
    </main>
  )
}
