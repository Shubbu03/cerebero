import { type ReactNode, useEffect, useMemo, useState } from 'react'

import {
  ThemeContext,
  type ThemeContextValue,
  themes,
  type Theme,
} from './theme-context'

const themeStorageKey = 'cerebero-theme'

function isTheme(value: string | null): value is Theme {
  return value !== null && themes.some((theme) => theme === value)
}

function readTheme(): Theme {
  const storedTheme = window.localStorage.getItem(themeStorageKey)
  return isTheme(storedTheme) ? storedTheme : 'system'
}

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme !== 'system') {
    return theme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(theme: Theme): void {
  const resolvedTheme = resolveTheme(theme)
  const root = document.documentElement

  root.classList.toggle('dark', resolvedTheme === 'dark')
  root.dataset.theme = theme

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolvedTheme === 'dark' ? '#0D1210' : '#F3F0E8')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme)

  useEffect(() => {
    applyTheme(theme)

    if (theme !== 'system') {
      return undefined
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyTheme('system')
    media.addEventListener('change', handleChange)

    return () => media.removeEventListener('change', handleChange)
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      setTheme: (nextTheme) => {
        window.localStorage.setItem(themeStorageKey, nextTheme)
        setThemeState(nextTheme)
      },
      theme,
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
