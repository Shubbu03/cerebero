import { Outlet, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '@cerebero/ui'

import { AppShell, AppShellLoading } from './app-shell'
import { CaptureFeatureEntry } from '../features/capture/capture-feature-entry'
import { SearchFeatureEntry } from '../features/search/search-feature-entry'
import { authClient } from '../lib/auth-client'
import { preloadDashboardRoutes } from './dashboard-route-loaders'

export function AuthenticatedLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isPending } = authClient.useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  useEffect(() => {
    void preloadDashboardRoutes()
  }, [])

  const signOut = async () => {
    setIsSigningOut(true)
    setSignOutError(null)

    try {
      const result = await authClient.signOut()
      if (result.error) {
        setSignOutError('Sign out could not be completed. Try again.')
        return
      }

      queryClient.clear()
      await navigate({ to: '/' })
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
          <p className="text-tertiary font-mono text-xs">Session ended</p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">
            Sign in to reopen your archive.
          </h1>
          <Button className="mt-6" onClick={() => void navigate({ to: '/' })}>
            Return home to sign in
          </Button>
        </div>
      </main>
    )
  }

  return (
    <SearchFeatureEntry>
      <CaptureFeatureEntry>
        {({ openCapture }) => (
          <AppShell
            isSigningOut={isSigningOut}
            openCapture={openCapture}
            signOut={() => void signOut()}
            signOutError={signOutError}
            user={{
              email: data.user.email,
              image: data.user.image ?? null,
              name: data.user.name,
            }}
          >
            <Outlet />
          </AppShell>
        )}
      </CaptureFeatureEntry>
    </SearchFeatureEntry>
  )
}
