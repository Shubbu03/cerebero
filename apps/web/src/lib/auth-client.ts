import { createAuthClient } from 'better-auth/react'

import { apiOrigin } from './environment'

export const authClient = createAuthClient({
  baseURL: apiOrigin,
  fetchOptions: {
    credentials: 'include',
  },
})
