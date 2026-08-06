import { Moon, Sun } from '@phosphor-icons/react'

import { themes, useTheme, type Theme } from './theme-context'

const themeLabels: Record<Theme, string> = {
  dark: 'Dark',
  light: 'Light',
  system: 'System',
}

export function ThemeControl() {
  const { setTheme, theme } = useTheme()

  return (
    <label className="text-secondary flex items-center gap-2 text-xs font-medium">
      <Sun aria-hidden="true" size={16} weight="bold" />
      <span className="sr-only">Theme</span>
      <select
        className="bg-surface text-primary focus-visible:ring-focus rounded-control border-subtle min-h-10 border px-2 outline-none focus-visible:ring-2"
        onChange={(event) => setTheme(event.target.value as Theme)}
        value={theme}
      >
        {themes.map((option) => (
          <option key={option} value={option}>
            {themeLabels[option]}
          </option>
        ))}
      </select>
      <Moon aria-hidden="true" size={16} weight="bold" />
    </label>
  )
}
