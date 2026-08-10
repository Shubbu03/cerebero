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
        Cerebero stores the links and notes you capture in a private Library
        owned by your Google account.
      </p>
      <p>
        Authentication uses Google OAuth through Better Auth. Session cookies
        identify you for private requests. Share Links expose only a read-only
        projection of one Item when you create them.
      </p>
      <p>
        You can delete your account and owned data from Settings. We do not sell
        personal data.
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
