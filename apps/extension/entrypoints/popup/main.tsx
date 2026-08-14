import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import './styles.css'

const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
function applySystemTheme() {
  document.documentElement.classList.toggle('dark', colorScheme.matches)
}
applySystemTheme()
colorScheme.addEventListener('change', applySystemTheme)

const root = document.querySelector('#root')
if (!root) {
  throw new Error('The popup root is missing.')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
