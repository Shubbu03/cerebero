import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import '@cerebero/ui/styles.css'

import { AppProviders } from './app/providers'
import { router } from './app/router'

const rootElement = document.querySelector('#root')

if (!rootElement) {
  throw new Error('The application root element is missing.')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
