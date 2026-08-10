import type { CaptureItemInput } from '@cerebero/contracts'
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'

import { useCaptureItem } from './data-access/use-capture-item'
import { CaptureUiSuccessNotice } from './ui/capture-ui-success-notice'

const importCaptureDialog = () => import('./ui/capture-ui-dialog')

const CaptureUiDialog = lazy(async () => {
  const module = await importCaptureDialog()
  return { default: module.CaptureUiDialog }
})

type CaptureFeatureEntryProps = {
  children: (actions: { openCapture: () => void }) => ReactNode
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'SELECT' ||
    target.tagName === 'TEXTAREA'
  )
}

export function CaptureFeatureEntry({ children }: CaptureFeatureEntryProps) {
  const captureMutation = useCaptureItem()
  const [isOpen, setIsOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    void importCaptureDialog()
  }, [])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== 'c' ||
        isEditableTarget(event.target)
      ) {
        return
      }

      event.preventDefault()
      setIsOpen(true)
    }

    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!showSuccess) {
      return
    }

    const timeout = window.setTimeout(() => setShowSuccess(false), 4_000)
    return () => window.clearTimeout(timeout)
  }, [showSuccess])

  const captureItem = async (input: CaptureItemInput) => {
    try {
      const result = await captureMutation.mutateAsync(input)
      if (result.outcome === 'captured') {
        setShowSuccess(true)
      }
      return result
    } catch {
      return {
        message: 'Capture could not be completed. Try again.',
        outcome: 'error' as const,
      }
    }
  }

  return (
    <>
      {children({ openCapture: () => setIsOpen(true) })}
      {isOpen ? (
        <Suspense fallback={null}>
          <CaptureUiDialog
            captureItem={captureItem}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
          />
        </Suspense>
      ) : null}
      {showSuccess ? (
        <CaptureUiSuccessNotice dismiss={() => setShowSuccess(false)} />
      ) : null}
    </>
  )
}
