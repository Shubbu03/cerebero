import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// Lazy feature imports can take longer on a cold, parallel Vitest run than in
// an already-transformed focused test. Keep async assertions deterministic
// without adding sleeps to individual tests.
configure({ asyncUtilTimeout: 3_000 })

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (query: string) => ({
    addEventListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => undefined,
  }),
})

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: () => undefined,
})
