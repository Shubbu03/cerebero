import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@cerebero/ui'

import { AppShell, AppShellLoading } from './app-shell'
import { CaptureFeatureEntry } from '../features/capture/capture-feature-entry'
import { authClient } from '../lib/auth-client'

export function AuthenticatedLayout() {
  const navigate = useNavigate()
  const { data, isPending } = authClient.useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const signOut = async () => {
    setIsSigningOut(true)
    setSignOutError(null)

    try {
      const result = await authClient.signOut()
      if (result.error) {
        setSignOutError('Sign out could not be completed. Try again.')
        return
      }

      await navigate({ to: '/login' })
    } catch {
      setSignOutError('Sign out could not be completed. Try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  if (isPending) {
    return <AppShellLoading />
  }

  if (!data) {
    return (
      <main className="bg-canvas text-primary grid min-h-dvh place-items-center px-5 text-center">
        <div className="max-w-md">
          <p className="text-tertiary font-mono text-xs tracking-[0.16em] uppercase">
            Session ended
          </p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">
            Sign in to reopen your archive.
          </h1>
          <Button
            className="mt-6"
            onClick={() => void navigate({ to: '/login' })}
          >
            Continue to sign in
          </Button>
          <Link
            className="text-secondary hover:text-primary focus-visible:ring-focus rounded-control mt-4 block text-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
            to="/"
          >
            Return home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <CaptureFeatureEntry>
      {({ openCapture }) => (
        <AppShell
          isSigningOut={isSigningOut}
          openCapture={openCapture}
          signOut={() => void signOut()}
          signOutError={signOutError}
          user={{ email: data.user.email, name: data.user.name }}
        >
          <Outlet />
        </AppShell>
      )}
    </CaptureFeatureEntry>
  )
}
