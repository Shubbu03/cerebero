import { MoonIcon, SunIcon } from '@phosphor-icons/react'

import { themes, useTheme, type Theme } from './theme-context'

const themeLabels: Record<Theme, string> = {
  dark: 'Dark',
  light: 'Light',
  system: 'System',
}

export function ThemeControl() {
  const { setTheme, theme } = useTheme()

  return (
    <label className="text-secondary flex items-center gap-1.5 text-xs font-medium">
      <SunIcon aria-hidden="true" className="hidden sm:block" size={15} weight="bold" />
      <span className="sr-only">Theme</span>
      <select
        aria-label="Theme"
        className="bg-surface text-primary focus-visible:ring-focus border-border-subtle rounded-control min-h-9 border px-2 text-xs outline-none focus-visible:ring-2"
        onChange={(event) => setTheme(event.target.value as Theme)}
        value={theme}
      >
        {themes.map((option) => (
          <option key={option} value={option}>
            {themeLabels[option]}
          </option>
        ))}
      </select>
      <MoonIcon aria-hidden="true" className="hidden sm:block" size={15} weight="bold" />
    </label>
  )
}
