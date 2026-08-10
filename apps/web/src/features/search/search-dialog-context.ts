import { createContext, useContext } from 'react'

type SearchDialogContextValue = {
  openSearch: () => void
}

export const SearchDialogContext =
  createContext<SearchDialogContextValue | null>(null)

export function useSearchDialog(): SearchDialogContextValue {
  const context = useContext(SearchDialogContext)

  if (!context) {
    throw new Error('useSearchDialog must be used within SearchFeatureEntry.')
  }

  return context
}
