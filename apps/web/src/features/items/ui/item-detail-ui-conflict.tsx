import { Button } from '@cerebero/ui'

type ItemDetailUiConflictProps = {
  isRefreshing: boolean
  onDismiss: () => void
  onReload: () => void
}

export function ItemDetailUiConflict({
  isRefreshing,
  onDismiss,
  onReload,
}: ItemDetailUiConflictProps) {
  return (
    <div
      className="border-danger-border bg-danger-soft text-danger-strong rounded-control mt-6 border px-4 py-3"
      role="alert"
    >
      <p className="text-sm font-semibold">This Item changed elsewhere.</p>
      <p className="mt-1 text-sm">
        Your edit was not saved. Reload the latest version, then try again.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={isRefreshing}
          onClick={onReload}
          size="compact"
          type="button"
        >
          {isRefreshing ? 'Reloading…' : 'Reload Item'}
        </Button>
        <Button
          disabled={isRefreshing}
          onClick={onDismiss}
          size="compact"
          type="button"
          variant="ghost"
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
