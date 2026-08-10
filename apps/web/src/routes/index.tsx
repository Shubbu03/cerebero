import {
  ArrowRightIcon,
  BookOpenIcon,
  GithubLogoIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Button, FormMessage, IconButton, Input } from '@cerebero/ui'

import { ThemeControl } from '../app/theme-control'
import { Wordmark } from '../app/wordmark'
import { authClient } from '../lib/auth-client'
import { getAuthCallbackUrl } from '../features/auth/auth-callback'
import { getAuthErrorMessage } from '../features/auth/auth-error'

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
                <BookOpenIcon size={18} weight="bold" />
                Library
              </span>
            </div>
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="border-border-subtle flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-tertiary font-mono text-[0.6875rem]">
                Library · Saved immediately
              </p>
              <h2 className="font-display mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                Capture to Library
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

          <div className="border-border-subtle bg-sunken border-b px-4 py-4 sm:px-5">
            <p className="text-tertiary font-mono text-[0.6875rem]">Capture</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="relative">
                <LinkSimpleIcon
                  aria-hidden="true"
                  className="text-tertiary absolute top-1/2 left-3 -translate-y-1/2"
                  size={16}
                />
                <Input
                  aria-label="Link or note preview"
                  className="pl-9"
                  defaultValue="https://example.com/essay"
                  readOnly
                />
              </div>
              <Button size="compact" type="button">
                Save to Library
              </Button>
            </div>
          </div>

          <ul className="divide-border-subtle divide-y">
            <li className="px-4 py-4 sm:px-5">
              <p className="text-sm font-semibold">A useful essay</p>
              <p className="text-tertiary mt-1 text-xs">
                example.com · just now
              </p>
            </li>
            <li className="px-4 py-4 sm:px-5">
              <p className="text-sm font-semibold">Meeting notes</p>
              <p className="text-tertiary mt-1 text-xs">Note · yesterday</p>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

const workflow = [
  {
    title: 'Save',
    copy: 'Links and notes go straight to your Library.',
  },
  {
    title: 'Organize',
    copy: 'Add context and tags only when they are useful.',
  },
  {
    title: 'Find',
    copy: 'Search the whole Library when you need something back.',
  },
] as const

export function LandingRoute() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const googleSignInLock = useRef(false)
  const [isGoogleSignInPending, setIsGoogleSignInPending] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && session) {
      void navigate({ to: '/library' })
    }
  }, [isPending, navigate, session])

  const continueWithGoogle = async () => {
    if (googleSignInLock.current) {
      return
    }

    googleSignInLock.current = true
    setIsGoogleSignInPending(true)
    setAuthError(null)
    try {
      const result = await authClient.signIn.social({
        callbackURL: getAuthCallbackUrl('/library'),
        provider: 'google',
      })
      if (result?.error) {
        setAuthError(
          getAuthErrorMessage(
            result.error,
            'Google sign-in could not be completed. Try again.',
          ),
        )
      }
    } catch (caught) {
      setAuthError(
        getAuthErrorMessage(
          caught,
          'Google sign-in could not be completed. Try again.',
        ),
      )
    } finally {
      googleSignInLock.current = false
      setIsGoogleSignInPending(false)
    }
  }

  if (session) {
    return (
      <main className="bg-canvas text-primary grid min-h-dvh place-items-center px-5">
        <p className="text-secondary text-sm" aria-busy="true">
          Opening your Library…
        </p>
      </main>
    )
  }

  return (
    <div className="bg-canvas text-primary relative isolate min-h-dvh overflow-hidden">
      <div
        aria-hidden="true"
        className="border-border-subtle/60 pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[48rem] max-w-6xl border-x"
      >
        <div className="border-border-subtle/45 absolute inset-y-0 left-1/3 hidden border-l sm:block" />
        <div className="border-border-subtle/45 absolute inset-y-0 left-2/3 hidden border-l sm:block" />
        <div className="bg-accent/8 border-border-subtle/60 absolute top-36 right-0 hidden h-56 w-1/3 border-y border-l lg:block" />
      </div>

      <header className="border-border-subtle relative mx-auto flex max-w-6xl items-center justify-between gap-4 border-b px-5 py-4 sm:px-8">
        <Wordmark />
        <div className="flex items-center gap-2">
          <ThemeControl />
          <Button
            disabled={isGoogleSignInPending}
            onClick={() => {
              void continueWithGoogle()
            }}
            size="compact"
            variant="outline"
          >
            {isGoogleSignInPending ? 'Connecting…' : 'Sign in'}
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-20">
        <section className="grid items-end gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-accent-strong mb-5 font-mono text-sm">
              Your private reference Library
            </p>
            <h1 className="font-display text-[clamp(3rem,8vw,5.75rem)] leading-[0.94] font-medium tracking-[-0.045em]">
              Keep the things worth coming back to.
            </h1>
            <p className="text-secondary mt-6 max-w-2xl text-base leading-7 sm:text-lg">
              Cerebero keeps your links and notes together in one private,
              searchable Library—without turning saving into a filing job.
            </p>
            <Button
              className="mt-8"
              disabled={isGoogleSignInPending}
              onClick={() => {
                void continueWithGoogle()
              }}
            >
              {isGoogleSignInPending ? (
                <SpinnerGapIcon
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                  weight="bold"
                />
              ) : null}
              {isGoogleSignInPending ? 'Connecting…' : 'Get Started'}
              {!isGoogleSignInPending ? (
                <ArrowRightIcon size={17} weight="bold" />
              ) : null}
            </Button>
            {authError ? (
              <div className="mt-4 max-w-md">
                <FormMessage>{authError}</FormMessage>
              </div>
            ) : null}
          </div>

          <aside
            className="border-border-strong bg-surface/90 border"
            aria-label="How Cerebero works"
          >
            <p className="border-border-subtle text-secondary border-b px-5 py-4 text-sm font-medium">
              One simple workflow
            </p>
            <ol className="divide-border-subtle divide-y">
              {workflow.map((step, index) => (
                <li
                  className="grid grid-cols-[1.5rem_1fr] gap-3 px-5 py-4"
                  key={step.title}
                >
                  <span className="text-accent-strong font-mono text-xs">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">{step.title}</h2>
                    <p className="text-secondary mt-1 text-sm leading-5">
                      {step.copy}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <div>
          <ProductPreview />
        </div>
      </main>

      <footer className="border-border-subtle border-t">
        <div className="text-tertiary mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs sm:px-8">
          <p>Cerebero</p>
          <nav aria-label="Footer" className="flex items-center gap-4">
            <Link
              className="hover:text-primary underline-offset-4 hover:underline"
              to="/privacy"
            >
              Privacy
            </Link>
            <Link
              className="hover:text-primary underline-offset-4 hover:underline"
              to="/terms"
            >
              Terms
            </Link>
            <a
              aria-label="Cerebero on GitHub"
              className="hover:text-primary focus-visible:outline-focus rounded-control inline-flex min-h-8 min-w-8 items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
              href="https://github.com/Shubbu03/cerebero"
              rel="noreferrer"
              target="_blank"
            >
              <GithubLogoIcon aria-hidden="true" size={19} weight="bold" />
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
