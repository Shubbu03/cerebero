import { PlusIcon, SignOutIcon, TrayIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button, IconButton } from '@cerebero/ui'

import { ThemeControl } from './theme-control'
import { Wordmark } from './wordmark'

type AppShellProps = {
  children: ReactNode
  isSigningOut: boolean
  openCapture: () => void
  signOut: () => void
  signOutError: string | null
  user: {
    email: string
    name: string
  }
}

const inboxLinkClasses =
  'focus-visible:ring-focus focus-visible:ring-offset-surface flex min-h-11 items-center justify-between rounded-control border-l-2 px-3 py-2.5 text-sm transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'

export function AppShell({
  children,
  isSigningOut,
  openCapture,
  signOut,
  signOutError,
  user,
}: AppShellProps) {
  return (
    <div className="bg-canvas text-primary min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        className="bg-primary text-canvas focus-visible:ring-focus rounded-control fixed top-3 left-3 z-50 -translate-y-20 px-3 py-2 text-sm font-semibold transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:outline-none"
        href="#main-content"
      >
        Skip to content
      </a>

      <aside className="border-border-subtle bg-surface sticky top-0 hidden h-dvh border-r p-5 lg:flex lg:flex-col">
        <Link
          aria-label="Cerebero Inbox"
          className="focus-visible:ring-focus rounded-control w-fit focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          to="/inbox"
        >
          <Wordmark />
        </Link>

        <Button
          aria-keyshortcuts="C"
          aria-label="Capture"
          className="mt-8 w-full"
          onClick={openCapture}
        >
          <PlusIcon aria-hidden="true" size={17} weight="bold" />
          Capture
          <kbd
            className="border-accent-foreground/25 ml-auto border-l pl-2 font-mono text-[0.625rem] font-medium"
            aria-hidden="true"
          >
            C
          </kbd>
        </Button>

        <nav className="mt-8" aria-label="Primary navigation">
          <p className="text-tertiary px-3 font-mono text-[0.6875rem] tracking-[0.16em] uppercase">
            Workspace
          </p>
          <div className="mt-3 grid gap-1">
            <Link
              activeOptions={{ exact: true }}
              activeProps={{
                className: `${inboxLinkClasses} border-accent-strong bg-sunken text-primary font-semibold`,
              }}
              inactiveProps={{
                className: `${inboxLinkClasses} border-transparent text-secondary hover:bg-sunken hover:text-primary`,
              }}
              to="/inbox"
            >
              <span className="flex items-center gap-2.5">
                <TrayIcon aria-hidden="true" size={18} weight="bold" />
                Inbox
              </span>
            </Link>
          </div>
        </nav>

        <div className="border-border-subtle mt-auto border-t pt-4">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="text-tertiary mt-1 truncate text-xs">{user.email}</p>
          <Button
            className="mt-4 w-full"
            disabled={isSigningOut}
            onClick={signOut}
            variant="ghost"
          >
            <SignOutIcon aria-hidden="true" size={17} />
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </Button>
          {signOutError ? (
            <p className="text-danger-strong mt-2 text-xs" role="alert">
              {signOutError}
            </p>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-border-subtle bg-canvas/95 sticky top-0 z-30 flex min-h-16 items-center justify-between border-b px-4 backdrop-blur-sm sm:px-6 lg:hidden">
          <Link
            aria-label="Cerebero Inbox"
            className="focus-visible:ring-focus rounded-control focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            to="/inbox"
          >
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1">
            <IconButton
              aria-keyshortcuts="C"
              label="Capture"
              onClick={openCapture}
            >
              <PlusIcon aria-hidden="true" size={19} weight="bold" />
            </IconButton>
            <ThemeControl />
            <IconButton
              disabled={isSigningOut}
              label={isSigningOut ? 'Signing out' : 'Sign out'}
              onClick={signOut}
            >
              <SignOutIcon aria-hidden="true" size={19} />
            </IconButton>
          </div>
        </header>

        {signOutError ? (
          <div
            className="border-danger-border bg-danger-soft text-danger-strong border-b px-4 py-2 text-sm lg:hidden"
            role="alert"
          >
            {signOutError}
          </div>
        ) : null}

        <main id="main-content">{children}</main>
      </div>
    </div>
  )
}

export function AppShellLoading() {
  return (
    <main
      className="bg-canvas text-primary min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]"
      aria-busy="true"
    >
      <div className="border-border-subtle bg-surface hidden border-r p-5 lg:block">
        <Wordmark />
      </div>
      <div>
        <div className="border-border-subtle flex min-h-16 items-center border-b px-4 lg:hidden">
          <Wordmark />
        </div>
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <p className="text-secondary text-sm">Opening your archive…</p>
        </div>
      </div>
    </main>
  )
}
