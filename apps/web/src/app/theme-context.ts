import { createContext, useContext } from 'react'

export const themes = ['light', 'dark', 'system'] as const
export type Theme = (typeof themes)[number]
export type ResolvedTheme = Exclude<Theme, 'system'>

export type ThemeContextValue = {
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  theme: Theme
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
