import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { SearchDialogContext } from './search-dialog-context'
import { SearchUiDialog } from './ui/search-ui-dialog'

type SearchFeatureEntryProps = {
  children: ReactNode
}

export function SearchFeatureEntry({ children }: SearchFeatureEntryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const context = useMemo(() => ({ openSearch: () => setIsOpen(true) }), [])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== 'k' ||
        (!event.metaKey && !event.ctrlKey)
      ) {
        return
      }

      event.preventDefault()
      setIsOpen(true)
    }

    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  return (
    <SearchDialogContext.Provider value={context}>
      {children}
      {isOpen ? <SearchUiDialog isOpen setIsOpen={setIsOpen} /> : null}
    </SearchDialogContext.Provider>
  )
}
