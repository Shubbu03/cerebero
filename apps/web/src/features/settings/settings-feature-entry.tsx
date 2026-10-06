import { Button, FormMessage } from '@cerebero/ui'
import { SignOutIcon, TrashIcon, UserIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { authClient } from '../../lib/auth-client'
import { getAccountDeletionErrorMessage } from '../auth/auth-error'
import { SettingsThemeSelector } from './settings-theme-selector'

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
      <section className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <p className="text-secondary text-sm" role="status">
          Loading account…
        </p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
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
    <section className="flex w-full flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="border-border-strong border-b pb-6 sm:pb-7">
        <h1 className="font-display text-[clamp(3.25rem,6vw,5rem)] leading-none font-medium tracking-[-0.05em]">
          Settings
        </h1>
        <p className="text-secondary mt-3 text-sm">
          Manage your account and appearance.
        </p>
      </header>

      <div className="divide-border-subtle divide-y">
        <section
          aria-labelledby="profile-heading"
          className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between md:gap-8"
        >
          <div>
            <h2 className="text-sm font-semibold" id="profile-heading">
              Profile
            </h2>
            <p className="text-secondary mt-1 text-sm">
              Your connected Google account.
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-3 md:w-96 md:shrink-0">
            {data.user.image ? (
              <img
                alt=""
                className="border-border-subtle size-11 shrink-0 rounded-full border object-cover"
                src={data.user.image}
              />
            ) : (
              <div className="border-border-subtle bg-sunken text-secondary grid size-11 shrink-0 place-items-center rounded-full border">
                <UserIcon aria-hidden="true" size={20} />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{data.user.name}</p>
              <p className="text-secondary truncate text-sm">
                {data.user.email}
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="theme-heading"
          className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between md:gap-8"
        >
          <div>
            <h2 className="text-sm font-semibold" id="theme-heading">
              Appearance
            </h2>
            <p className="text-secondary mt-1 text-sm">
              Choose how Cerebero looks on this device.
            </p>
          </div>
          <SettingsThemeSelector />
        </section>

        <section
          aria-labelledby="session-heading"
          className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between md:gap-8"
        >
          <div>
            <h2 className="text-sm font-semibold" id="session-heading">
              Session
            </h2>
            <p className="text-secondary mt-1 text-sm">
              Sign out of Cerebero on this device.
            </p>
          </div>
          <Button
            className="w-fit shrink-0"
            disabled={isSigningOut || isDeleting}
            onClick={() => {
              void signOut()
            }}
            variant="outline"
          >
            <SignOutIcon aria-hidden="true" size={17} />
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </section>

        <section
          aria-labelledby="danger-heading"
          className="flex flex-col gap-4 py-6 md:flex-row md:items-start md:justify-between md:gap-8"
        >
          <div className="max-w-xl">
            <h2
              className="text-danger-strong text-sm font-semibold"
              id="danger-heading"
            >
              Delete account
            </h2>
            <p className="text-secondary mt-1 text-sm leading-6">
              Permanently delete your account and all saved items, tags, and
              share links. This cannot be undone.
            </p>
          </div>
          {confirmDelete ? (
            <div className="border-danger-border bg-danger-soft rounded-control border p-4 md:w-96 md:shrink-0">
              <p className="text-danger-strong text-sm font-semibold">
                Delete your account permanently?
              </p>
              <p className="text-secondary mt-1 text-xs leading-5">
                All your saved data will be removed. You cannot recover it.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="border-danger-strong bg-danger-strong text-canvas hover:border-danger-strong hover:bg-danger-strong/90 hover:text-canvas"
                  disabled={isDeleting || isSigningOut}
                  onClick={() => {
                    void deleteAccount()
                  }}
                  variant="outline"
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
            </div>
          ) : (
            <Button
              className="border-danger-border text-danger-strong hover:border-danger-strong hover:bg-danger-soft w-fit shrink-0"
              disabled={isDeleting || isSigningOut}
              onClick={() => setConfirmDelete(true)}
              variant="outline"
            >
              <TrashIcon aria-hidden="true" size={17} />
              Delete account
            </Button>
          )}
        </section>
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
    </section>
  )
}
