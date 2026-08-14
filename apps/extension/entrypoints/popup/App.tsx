import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  CheckCircleIcon,
  FloppyDiskIcon,
  GoogleLogoIcon,
  LinkIcon,
  SignOutIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import type { AuthenticationState } from '../../src/auth/auth-types'
import type {
  CaptureAttemptResponse,
  CaptureDraftResponse,
} from '../../src/capture/capture-types'
import { extensionEnvironment } from '../../src/config/environment'
import { sendAuthenticationMessage } from '../../src/messaging/auth-messages'
import {
  sendCaptureDraftMessage,
  sendClearPendingCaptureMessage,
  sendReviewedCaptureMessage,
} from '../../src/messaging/capture-messages'

type PopupState = AuthenticationState | { status: 'loading' }
type DraftState = CaptureDraftResponse | { status: 'loading' }

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="border-border-strong bg-primary text-canvas after:bg-canvas relative grid size-9 place-items-center border font-mono text-sm font-semibold after:absolute after:right-[-1px] after:bottom-[-1px] after:size-2.5 after:[clip-path:polygon(100%_0,100%_100%,0_100%)]"
    >
      C
    </span>
  )
}

function Header() {
  return (
    <header className="border-border-subtle flex items-center justify-between border-b px-5 py-4">
      <div className="flex items-center gap-3">
        <BrandMark />
        <span className="font-display text-[1.35rem] leading-none font-semibold">
          Cerebero
        </span>
      </div>
      <span className="text-tertiary font-mono text-[0.65rem] tracking-[0.14em]">
        Extension
      </span>
    </header>
  )
}

function PrimaryButton({
  children,
  disabled = false,
  onClick,
  type = 'button',
}: {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <button
      className="rounded-control bg-accent text-accent-foreground hover:bg-accent-strong hover:text-accent-contrast focus-visible:outline-focus flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 px-4 py-2.5 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  )
}

function SignedOut({
  hasPendingCapture,
  onSignIn,
}: {
  hasPendingCapture: boolean
  onSignIn: () => void
}) {
  return (
    <section className="animate-rise-in space-y-6 px-5 py-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl leading-[1.02] font-medium text-balance">
          {hasPendingCapture
            ? 'One page is waiting.'
            : 'Your Library, one click away.'}
        </h1>
        <p className="text-secondary max-w-[34ch] text-sm leading-6">
          {hasPendingCapture
            ? 'Sign in, review the page, then confirm before Cerebero saves it.'
            : 'Connect the same Google account you use for Cerebero.'}
        </p>
      </div>
      <PrimaryButton onClick={onSignIn}>
        <GoogleLogoIcon aria-hidden="true" size={19} weight="bold" />
        Sign in with Google
        <ArrowRightIcon aria-hidden="true" size={17} weight="bold" />
      </PrimaryButton>
      <p className="text-tertiary font-mono text-[0.67rem] leading-5">
        Cerebero receives a scoped extension session. Your Google token is not
        stored.
      </p>
    </section>
  )
}

function Loading({ label }: { label: string }) {
  return (
    <section
      aria-live="polite"
      className="grid min-h-64 place-items-center px-5 py-8 text-center"
    >
      <div className="space-y-4">
        <SpinnerGapIcon
          aria-hidden="true"
          className="text-accent-strong mx-auto animate-spin"
          size={30}
        />
        <p className="text-secondary text-sm">{label}</p>
      </div>
    </section>
  )
}

function AccountFooter({
  email,
  onSignOut,
}: {
  email: string
  onSignOut: () => void
}) {
  return (
    <footer className="border-border-subtle flex items-center justify-between gap-3 border-t px-5 py-3">
      <span className="text-tertiary min-w-0 truncate font-mono text-[0.66rem]">
        {email}
      </span>
      <button
        aria-label="Sign out"
        className="text-secondary hover:text-primary focus-visible:outline-focus grid size-8 shrink-0 cursor-pointer place-items-center rounded-full transition-colors focus-visible:outline-2"
        onClick={onSignOut}
        title="Sign out"
        type="button"
      >
        <SignOutIcon aria-hidden="true" size={17} />
      </button>
    </footer>
  )
}

function ItemLink({ id, label }: { id: string; label: string }) {
  const href = new URL(
    `/items/${encodeURIComponent(id)}`,
    extensionEnvironment.webOrigin,
  )
  return (
    <a
      className="text-accent-strong hover:text-primary focus-visible:outline-focus inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      href={href.toString()}
      rel="noreferrer"
      target="_blank"
    >
      {label}
      <ArrowSquareOutIcon aria-hidden="true" size={15} weight="bold" />
    </a>
  )
}

function CaptureResult({
  onCaptureAnother,
  result,
}: {
  onCaptureAnother: () => void
  result: Extract<CaptureAttemptResponse, { status: 'captured' }>
}) {
  return (
    <section aria-live="polite" className="animate-rise-in px-5 py-6">
      <div className="rounded-surface border-border-subtle bg-surface border p-5">
        <CheckCircleIcon
          aria-hidden="true"
          className="text-accent-strong"
          size={25}
          weight="fill"
        />
        <h1 className="font-display mt-4 text-2xl font-medium">
          Saved to your Library.
        </h1>
        <p className="text-secondary mt-2 line-clamp-2 text-sm leading-6">
          {result.item.displayTitle}
        </p>
        <div className="mt-5 flex items-center justify-between gap-4">
          <ItemLink id={result.item.id} label="View Item" />
          <button
            className="text-secondary hover:text-primary focus-visible:outline-focus cursor-pointer text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={onCaptureAnother}
            type="button"
          >
            Capture another
          </button>
        </div>
      </div>
    </section>
  )
}

function CaptureForm({
  draft,
  onAuthenticationRequired,
  onDraftChanged,
}: {
  draft: Extract<CaptureDraftResponse, { status: 'ready' }>['draft']
  onAuthenticationRequired: () => void
  onDraftChanged: (draft: CaptureDraftResponse) => void
}) {
  const [title, setTitle] = useState(draft.title ?? '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CaptureAttemptResponse | null>(null)

  const capture = useCallback(
    async (allowDuplicate: boolean) => {
      if (busy) return
      setBusy(true)
      setResult(null)
      try {
        const nextResult = await sendReviewedCaptureMessage({
          allowDuplicate,
          authoredTitle: title.trim() || null,
          noteMarkdown: note || null,
          originalUrl: draft.url,
          pendingCaptureId: draft.pendingCaptureId,
        })
        if (nextResult.status === 'authentication-required') {
          onAuthenticationRequired()
          return
        }
        setResult(nextResult)
      } catch {
        setResult({
          code: 'unknown',
          message: 'The Cerebero background service did not respond.',
          status: 'failed',
        })
      } finally {
        setBusy(false)
      }
    },
    [busy, draft, note, onAuthenticationRequired, title],
  )

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void capture(false)
  }

  if (result?.status === 'captured') {
    return (
      <CaptureResult
        onCaptureAnother={() => {
          setResult(null)
          void sendCaptureDraftMessage().then(onDraftChanged)
        }}
        result={result}
      />
    )
  }

  return (
    <form className="animate-rise-in px-5 py-5" onSubmit={submit}>
      {draft.source === 'pending-context-menu' ? (
        <div className="border-accent/40 bg-accent/8 mb-4 flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5">
          <p className="text-primary text-xs leading-5">
            Saved from the context menu. Review and confirm it below.
          </p>
          <button
            aria-label="Discard pending Capture"
            className="text-secondary hover:text-primary focus-visible:outline-focus mt-0.5 shrink-0 cursor-pointer focus-visible:outline-2"
            onClick={() => {
              if (!draft.pendingCaptureId) return
              void sendClearPendingCaptureMessage(draft.pendingCaptureId).then(
                onDraftChanged,
              )
            }}
            title="Discard pending Capture"
            type="button"
          >
            <XIcon aria-hidden="true" size={16} />
          </button>
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <span className="bg-surface text-secondary grid size-9 shrink-0 place-items-center rounded-lg">
          <LinkIcon aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl leading-tight font-medium">
            Save this page.
          </h1>
          <p className="text-tertiary mt-1 truncate font-mono text-[0.66rem]">
            {draft.url}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block space-y-1.5" htmlFor="capture-title">
          <span className="text-primary text-xs font-semibold">Title</span>
          <input
            autoFocus
            className="border-border-strong bg-canvas text-primary placeholder:text-tertiary focus:border-accent-strong focus-visible:outline-focus h-10 w-full rounded-lg border px-3 text-sm focus-visible:outline-2"
            id="capture-title"
            maxLength={300}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Optional title"
            value={title}
          />
        </label>
        <label className="block space-y-1.5" htmlFor="capture-note">
          <span className="text-primary text-xs font-semibold">
            Note <span className="text-tertiary font-normal">optional</span>
          </span>
          <textarea
            className="border-border-strong bg-canvas text-primary placeholder:text-tertiary focus:border-accent-strong focus-visible:outline-focus min-h-24 w-full resize-y rounded-lg border px-3 py-2.5 text-sm leading-5 focus-visible:outline-2"
            id="capture-note"
            maxLength={100_000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Why is this worth keeping? Markdown is supported."
            value={note}
          />
        </label>
      </div>

      {result?.status === 'duplicate' ? (
        <div
          aria-live="polite"
          className="border-warning-border bg-warning-soft text-warning-strong mt-4 rounded-lg border p-3"
        >
          <p className="text-sm font-semibold">Already in your Library.</p>
          <p className="mt-1 text-xs leading-5">
            Quick Capture never creates duplicates. You can still save another
            copy from this reviewed form.
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            {result.candidates[0] ? (
              <ItemLink id={result.candidates[0].id} label="View existing" />
            ) : (
              <span />
            )}
            <button
              className="hover:text-primary focus-visible:outline-focus cursor-pointer text-xs font-semibold underline underline-offset-4 focus-visible:outline-2"
              disabled={busy}
              onClick={() => void capture(true)}
              type="button"
            >
              Save another copy
            </button>
          </div>
        </div>
      ) : null}

      {result?.status === 'failed' ? (
        <p
          aria-live="polite"
          className="text-danger-strong mt-4 text-xs leading-5"
        >
          {result.message}
        </p>
      ) : null}

      <div className="mt-5">
        <PrimaryButton disabled={busy} type="submit">
          {busy ? (
            <SpinnerGapIcon
              aria-hidden="true"
              className="animate-spin"
              size={18}
            />
          ) : (
            <FloppyDiskIcon aria-hidden="true" size={18} weight="bold" />
          )}
          {busy ? 'Saving…' : 'Save to Library'}
        </PrimaryButton>
      </div>
    </form>
  )
}

function SignedIn({
  draftState,
  onAuthenticationRequired,
  onDraftChanged,
  onSignOut,
  state,
}: {
  draftState: DraftState
  onAuthenticationRequired: () => void
  onDraftChanged: (draft: CaptureDraftResponse) => void
  onSignOut: () => void
  state: Extract<AuthenticationState, { status: 'signed-in' }>
}) {
  return (
    <>
      <div className="max-h-[31rem] overflow-y-auto">
        {draftState.status === 'loading' ? (
          <Loading label="Reading the active page…" />
        ) : draftState.status === 'unsupported-page' ? (
          <section className="animate-rise-in px-5 py-6">
            <div className="rounded-surface border-border-subtle bg-surface border p-5">
              <WarningCircleIcon
                aria-hidden="true"
                className="text-secondary"
                size={24}
              />
              <h1 className="font-display mt-4 text-2xl font-medium">
                This page cannot be saved.
              </h1>
              <p className="text-secondary mt-2 text-sm leading-6">
                Open a regular HTTP or HTTPS page, then try Cerebero again.
              </p>
            </div>
          </section>
        ) : (
          <CaptureForm
            draft={draftState.draft}
            key={`${draftState.draft.source}:${draftState.draft.pendingCaptureId ?? draftState.draft.url}`}
            onAuthenticationRequired={onAuthenticationRequired}
            onDraftChanged={onDraftChanged}
          />
        )}
      </div>
      <AccountFooter email={state.session.user.email} onSignOut={onSignOut} />
    </>
  )
}

function Recovery({
  state,
  onRetry,
}: {
  state: Extract<
    AuthenticationState,
    { status: 'expired-session' | 'recoverable-error' }
  >
  onRetry: () => void
}) {
  const expired = state.status === 'expired-session'
  const message = expired
    ? 'Your extension session has expired. Sign in again to reconnect it.'
    : state.message

  return (
    <section aria-live="polite" className="animate-rise-in space-y-6 px-5 py-6">
      <div className="rounded-surface border-warning-border bg-warning-soft text-warning-strong border p-4">
        <WarningCircleIcon aria-hidden="true" size={24} weight="fill" />
        <h1 className="font-display mt-4 text-2xl font-medium">
          {expired ? 'Reconnect Cerebero.' : 'Connection interrupted.'}
        </h1>
        <p className="mt-2 text-sm leading-6">{message}</p>
      </div>
      <PrimaryButton onClick={onRetry}>
        <GoogleLogoIcon aria-hidden="true" size={19} weight="bold" />
        {expired ? 'Sign in again' : 'Try again'}
      </PrimaryButton>
    </section>
  )
}

export function App() {
  const [state, setState] = useState<PopupState>({ status: 'loading' })
  const [draftState, setDraftState] = useState<DraftState>({
    status: 'loading',
  })

  const loadDraft = useCallback(() => {
    setDraftState({ status: 'loading' })
    void sendCaptureDraftMessage()
      .then(setDraftState)
      .catch(() =>
        setDraftState({
          message: 'The active page could not be read.',
          status: 'unsupported-page',
        }),
      )
  }, [])

  useEffect(() => {
    let active = true
    void Promise.all([
      sendAuthenticationMessage({ type: 'authentication:get-state' }),
      sendCaptureDraftMessage(),
    ])
      .then(([nextState, nextDraft]) => {
        if (!active) return
        setState(nextState)
        setDraftState(nextDraft)
      })
      .catch(() => {
        if (!active) return
        setState({
          code: 'unknown',
          message: 'The Cerebero background service did not respond.',
          status: 'recoverable-error',
        })
      })
    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback(() => {
    setState({ status: 'authenticating' })
    void sendAuthenticationMessage({ type: 'authentication:sign-in' })
      .then((nextState) => {
        setState(nextState)
        if (nextState.status === 'signed-in') {
          loadDraft()
        }
      })
      .catch(() =>
        setState({
          code: 'unknown',
          message: 'The Cerebero background service did not respond.',
          status: 'recoverable-error',
        }),
      )
  }, [loadDraft])

  const signOut = useCallback(() => {
    setState({ status: 'authenticating' })
    void sendAuthenticationMessage({ type: 'authentication:sign-out' })
      .then(setState)
      .catch(() =>
        setState({
          code: 'network',
          message: 'Sign-out could not be completed. Try again.',
          status: 'recoverable-error',
        }),
      )
  }, [])

  const authenticationRequired = useCallback(() => {
    if (state.status !== 'signed-in') return
    setState({
      status: 'expired-session',
      user: state.session.user,
    })
  }, [state])

  const hasPendingCapture =
    draftState.status === 'ready' &&
    draftState.draft.source === 'pending-context-menu'

  return (
    <main className="bg-canvas text-primary w-[22.5rem] overflow-hidden">
      <Header />
      {state.status === 'loading' || state.status === 'authenticating' ? (
        <Loading
          label={
            state.status === 'authenticating'
              ? 'Finish choosing your Google account…'
              : 'Opening Cerebero…'
          }
        />
      ) : state.status === 'signed-out' ? (
        <SignedOut hasPendingCapture={hasPendingCapture} onSignIn={signIn} />
      ) : state.status === 'signed-in' ? (
        <SignedIn
          draftState={draftState}
          onAuthenticationRequired={authenticationRequired}
          onDraftChanged={setDraftState}
          onSignOut={signOut}
          state={state}
        />
      ) : (
        <Recovery onRetry={signIn} state={state} />
      )}
    </main>
  )
}
