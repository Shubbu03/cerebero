import { BookOpen, SignOut, Tray } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@cerebero/ui'

import { ThemeControl } from '../../app/theme-control'
import { Wordmark } from '../../app/wordmark'
import { authClient } from '../../lib/auth-client'

export function InboxRoute() {
  const navigate = useNavigate()
  const { data, isPending } = authClient.useSession()

  const signOut = async () => {
    await authClient.signOut()
    await navigate({ to: '/login' })
  }

  if (isPending) {
    return (
      <main
        className="bg-canvas grid min-h-screen place-items-center"
        aria-busy="true"
      >
        <p className="text-secondary text-sm">Opening your archive…</p>
      </main>
    )
  }

  return (
    <main className="bg-canvas text-primary min-h-screen lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)]">
      <aside className="border-border-subtle bg-surface hidden border-r p-5 lg:flex lg:flex-col">
        <Wordmark />
        <nav
          className="mt-10 grid gap-1 text-sm"
          aria-label="Primary navigation"
        >
          <div className="bg-sunken border-accent-strong flex items-center gap-2 border-l-2 px-3 py-2.5 font-semibold">
            <Tray size={18} weight="bold" /> Inbox
          </div>
          <div className="text-secondary flex items-center gap-2 px-3 py-2.5">
            <BookOpen size={18} /> Library
          </div>
        </nav>
        <div className="border-border-subtle mt-auto border-t pt-4">
          <p className="truncate text-sm font-semibold">{data?.user.name}</p>
          <p className="text-tertiary mt-1 truncate text-xs">
            {data?.user.email}
          </p>
          <Button
            className="mt-4 w-full"
            onClick={() => void signOut()}
            variant="ghost"
          >
            <SignOut size={17} /> Sign out
          </Button>
        </div>
      </aside>

      <section className="min-w-0">
        <header className="border-border-subtle flex items-center justify-between border-b px-5 py-4 sm:px-8">
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <p className="text-tertiary hidden font-mono text-xs tracking-[0.16em] uppercase lg:block">
            Private collection
          </p>
          <ThemeControl />
        </header>

        <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-accent-strong font-mono text-xs tracking-[0.18em] uppercase">
            Phase 1 · authenticated
          </p>
          <h1 className="font-display mt-4 text-5xl font-semibold tracking-[-0.035em] sm:text-6xl">
            Your Inbox is ready for its first capture.
          </h1>
          <p className="text-secondary mt-6 max-w-2xl text-base leading-7">
            Authentication and the tenant boundary live here. Item capture
            begins in Phase 2 after this account flow is connected to PostgreSQL
            and manually verified.
          </p>
        </div>
      </section>
    </main>
  )
}
