import { MoonIcon, SunIcon } from '@phosphor-icons/react'
import { IconButton } from '@cerebero/ui'

import { useTheme } from './theme-context'

export function ThemeControl({ showLabel = false }: { showLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${nextTheme} theme`
  const icon =
    nextTheme === 'dark' ? (
      <MoonIcon aria-hidden="true" size={19} weight="bold" />
    ) : (
      <SunIcon aria-hidden="true" size={19} weight="bold" />
    )

  if (showLabel) {
    return (
      <button
        aria-keyshortcuts="D"
        aria-label={label}
        className="focus-visible:ring-focus hover:bg-sunken hover:text-primary rounded-control text-secondary duration-fast flex min-h-11 w-full items-center gap-3 px-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        onClick={() => setTheme(nextTheme)}
        title={`${label} (D)`}
        type="button"
      >
        {icon}
        <span className="flex-1">Theme</span>
        <span className="text-tertiary text-xs capitalize">
          {resolvedTheme}
        </span>
      </button>
    )
  }

  return (
    <IconButton
      aria-keyshortcuts="D"
      label={label}
      onClick={() => setTheme(nextTheme)}
      title={`${label} (D)`}
    >
      {icon}
    </IconButton>
  )
}
