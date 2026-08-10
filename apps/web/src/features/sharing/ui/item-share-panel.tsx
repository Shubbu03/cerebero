import type { ItemView } from '@cerebero/contracts'
import { Button, FormMessage } from '@cerebero/ui'
import { useState } from 'react'

import {
  useCreateShare,
  useItemShareStatus,
  useRevokeShare,
  useRotateShare,
} from '../data-access/use-item-share'

type ItemSharePanelProps = {
  item: ItemView
}

function buildPublicShareUrl(token: string): string {
  return new URL(`/shared/${token}`, window.location.origin).toString()
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Fall through to the selection-based fallback.
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.append(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  } catch {
    return false
  }
}

export function ItemSharePanel({ item }: ItemSharePanelProps) {
  const canShare = item.status === 'library'
  const statusQuery = useItemShareStatus(item.id, canShare)
  const createShare = useCreateShare(item.id)
  const rotateShare = useRotateShare(item.id)
  const revokeShare = useRevokeShare(item.id)

  const [rawToken, setRawToken] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )
  const [error, setError] = useState<string | null>(null)
  const busy =
    createShare.isPending || rotateShare.isPending || revokeShare.isPending

  if (!canShare) {
    return (
      <section
        aria-labelledby="item-share-title"
        className="bg-surface rounded-surface p-4 sm:p-5"
      >
        <h2 className="text-tertiary font-mono text-xs" id="item-share-title">
          Share Link
        </h2>
        <p className="text-secondary mt-2 text-sm">
          Sharing is only available for Library Items.
        </p>
      </section>
    )
  }

  const active = statusQuery.data?.active === true
  const publicUrl = rawToken ? buildPublicShareUrl(rawToken) : null

  const run = async (operation: () => Promise<{ token?: string } | void>) => {
    setError(null)
    setCopyState('idle')
    try {
      const result = await operation()
      if (result && 'token' in result && result.token) {
        setRawToken(result.token)
      }
    } catch {
      setError('The Share Link could not be updated. Try again.')
    }
  }

  return (
    <section
      aria-labelledby="item-share-title"
      className="bg-surface rounded-surface p-4 sm:p-5"
    >
      <h2 className="text-tertiary font-mono text-xs" id="item-share-title">
        Share Link
      </h2>
      <p className="text-secondary mt-2 text-sm">
        {active
          ? 'An active read-only Share Link exists for this Item.'
          : 'Create a revocable read-only link. The raw token is shown only once.'}
      </p>

      {statusQuery.isError ? (
        <p className="text-danger-strong mt-3 text-sm" role="alert">
          Share status could not be loaded.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {!active ? (
          <Button
            disabled={busy}
            onClick={() => {
              void run(async () => createShare.mutateAsync())
            }}
            size="compact"
            variant="outline"
          >
            Create Share Link
          </Button>
        ) : (
          <>
            <Button
              disabled={busy}
              onClick={() => {
                void run(async () => rotateShare.mutateAsync())
              }}
              size="compact"
              variant="outline"
            >
              Rotate link
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                void run(async () => {
                  await revokeShare.mutateAsync()
                  setRawToken(null)
                })
              }}
              size="compact"
              variant="ghost"
            >
              Revoke link
            </Button>
          </>
        )}
      </div>

      {active && !rawToken ? (
        <p className="text-tertiary mt-3 text-xs">
          The existing raw token cannot be retrieved. Rotate to mint a new URL.
        </p>
      ) : null}

      {publicUrl ? (
        <div className="border-border-subtle bg-sunken mt-4 border p-3">
          <p className="text-xs font-medium">Public URL</p>
          <p className="mt-1 text-sm break-all">{publicUrl}</p>
          <p className="text-tertiary mt-2 text-xs">
            Rotation invalidates the previous URL immediately.
          </p>
          <Button
            className="mt-3"
            onClick={() => {
              void copyText(publicUrl).then((ok) => {
                setCopyState(ok ? 'copied' : 'failed')
              })
            }}
            size="compact"
            variant="outline"
          >
            {copyState === 'copied' ? 'Copied' : 'Copy link'}
          </Button>
          {copyState === 'failed' ? (
            <p className="text-secondary mt-2 text-xs" role="status">
              Clipboard access failed. Select and copy the URL manually.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3">
          <FormMessage>{error}</FormMessage>
        </div>
      ) : null}
    </section>
  )
}
