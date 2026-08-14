import { Link } from '@tanstack/react-router'

import { Wordmark } from '../app/wordmark'

function LegalPage({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <main className="bg-canvas text-primary min-h-dvh">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <Link to="/">
          <Wordmark />
        </Link>
        <h1 className="font-display mt-10 text-4xl font-semibold tracking-tight">
          {title}
        </h1>
        <div className="text-secondary mt-6 grid gap-4 text-sm leading-7">
          {children}
        </div>
        <p className="mt-10 text-sm">
          <Link className="underline underline-offset-4" to="/">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  )
}

export function PrivacyRoute() {
  return (
    <LegalPage title="Privacy">
      <p>
        Cerebero stores the links, Markdown notes, Tags, and Library state you
        choose to save in a private account connected through Google.
      </p>
      <p>
        The Chrome extension reads the current page URL and title only when you
        open its popup or explicitly choose Save to Cerebero from Chrome&apos;s
        page menu. It does not read page bodies, browsing history, bookmarks,
        form data, or other tabs. Authored titles and notes are sent only when
        you confirm Capture.
      </p>
      <p>
        Extension sign-in uses Chrome Identity with Google&apos;s email-only
        scope. A temporary Google access token is sent to the Cerebero API over
        HTTPS for verification and is never written to extension storage. The
        extension stores a scoped Cerebero session and basic account display
        information in local extension storage so it can Capture after the popup
        closes. Sign-out clears that local data and revokes the server session;
        otherwise the session expires after thirty days.
      </p>
      <p>
        A signed-out context-menu request may keep one pending page URL and
        title locally until you sign in, review it, and confirm Capture. A newer
        pending request replaces the older one.
      </p>
      <p>
        Cerebero uses this data only to authenticate you, provide your private
        Library, detect duplicates, perform Captures you request, and protect
        the service. We do not sell personal data or use it for advertising. Our
        use of information received from Google APIs follows the Chrome Web
        Store User Data Policy, including its Limited Use requirements.
      </p>
      <p>
        Share Links expose only a deliberately limited, read-only projection of
        one Item when you create them. You can revoke them at any time.
      </p>
      <p>
        You can delete your account and owned data from Settings. Uninstalling
        the extension clears its local Chrome storage but does not delete your
        Cerebero account. Questions can be sent to{' '}
        <a
          className="underline underline-offset-4"
          href="mailto:thatcoderguyshubham@gmail.com"
        >
          thatcoderguyshubham@gmail.com
        </a>
        .
      </p>
    </LegalPage>
  )
}

export function TermsRoute() {
  return (
    <LegalPage title="Terms">
      <p>
        Cerebero is a personal Library product. You are responsible for the
        content you capture and any Share Links you create.
      </p>
      <p>
        The service is provided as-is for personal use. Do not use Cerebero for
        illegal content or abuse of the API.
      </p>
      <p>
        Account access is through Google sign-in. Deleting your account removes
        owned Items, Tags, Share Links, sessions, and account records.
      </p>
    </LegalPage>
  )
}
