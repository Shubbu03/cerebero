import { type ReactNode, useEffect, useMemo, useState } from 'react'

import {
  ThemeContext,
  type ResolvedTheme,
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

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(theme: Theme, resolvedTheme: ResolvedTheme): void {
  const root = document.documentElement

  root.classList.toggle('dark', resolvedTheme === 'dark')
  root.dataset.theme = theme

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolvedTheme === 'dark' ? '#0D1210' : '#F3F0E8')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(readSystemTheme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    applyTheme(theme, resolvedTheme)
  }, [resolvedTheme, theme])

  useEffect(() => {
    if (theme !== 'system') {
      return undefined
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', handleChange)

    return () => media.removeEventListener('change', handleChange)
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      resolvedTheme,
      setTheme: (nextTheme) => {
        window.localStorage.setItem(themeStorageKey, nextTheme)
        setThemeState(nextTheme)
      },
      theme,
    }),
    [resolvedTheme, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
