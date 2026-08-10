import { Button, FormMessage } from '@cerebero/ui'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { ThemeControl } from '../../app/theme-control'
import { authClient } from '../../lib/auth-client'
import { getAccountDeletionErrorMessage } from '../auth/auth-error'

export function SettingsFeatureEntry() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isPending } = authClient.useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isPending) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-secondary text-sm">Loading account…</p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-secondary text-sm">Sign in is required.</p>
      </section>
    )
  }

  const signOut = async () => {
    setIsSigningOut(true)
    setError(null)
    try {
      const result = await authClient.signOut()
      if (result.error) {
        setError('Sign out could not be completed. Try again.')
        return
      }
      queryClient.clear()
      await navigate({ to: '/' })
    } catch {
      setError('Sign out could not be completed. Try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  const deleteAccount = async () => {
    setIsDeleting(true)
    setError(null)
    try {
      const result = await authClient.deleteUser()
      if (result.error) {
        setError(getAccountDeletionErrorMessage(result.error))
        return
      }
      queryClient.clear()
      await navigate({ to: '/' })
    } catch (caught) {
      setError(getAccountDeletionErrorMessage(caught))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="border-border-strong border-b pb-8">
        <p className="text-accent-strong font-mono text-xs">Account</p>
        <h1 className="font-display mt-3 text-[clamp(2.5rem,7vw,4.5rem)] leading-none font-medium tracking-[-0.05em]">
          Settings
        </h1>
      </header>

      <div className="mt-8 grid gap-8">
        <section aria-labelledby="profile-heading">
          <h2 className="text-sm font-semibold" id="profile-heading">
            Profile
          </h2>
          <div className="mt-3 flex items-center gap-3">
            {data.user.image ? (
              <img
                alt=""
                className="border-border-subtle size-12 rounded-full border object-cover"
                src={data.user.image}
              />
            ) : (
              <div className="border-border-subtle bg-sunken size-12 rounded-full border" />
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{data.user.name}</p>
              <p className="text-tertiary truncate text-sm">
                {data.user.email}
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="theme-heading">
          <h2 className="text-sm font-semibold" id="theme-heading">
            Theme
          </h2>
          <div className="mt-3">
            <ThemeControl />
          </div>
        </section>

        <section aria-labelledby="session-heading">
          <h2 className="text-sm font-semibold" id="session-heading">
            Session
          </h2>
          <Button
            className="mt-3"
            disabled={isSigningOut || isDeleting}
            onClick={() => {
              void signOut()
            }}
            variant="outline"
          >
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </section>

        <section aria-labelledby="danger-heading">
          <h2 className="text-sm font-semibold" id="danger-heading">
            Delete account
          </h2>
          <p className="text-secondary mt-2 text-sm leading-6">
            Permanently deletes your Cerebero account and owned data: Items,
            Tags, Share Links, sessions, and accounts. This cannot be undone.
          </p>
          {confirmDelete ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={isDeleting}
                onClick={() => {
                  void deleteAccount()
                }}
              >
                {isDeleting ? 'Deleting…' : 'Confirm delete account'}
              </Button>
              <Button
                disabled={isDeleting}
                onClick={() => setConfirmDelete(false)}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              className="mt-3"
              disabled={isDeleting}
              onClick={() => setConfirmDelete(true)}
              variant="outline"
            >
              Delete account
            </Button>
          )}
        </section>

        {error ? <FormMessage>{error}</FormMessage> : null}
      </div>
    </section>
  )
}
