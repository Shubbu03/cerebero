import xior from 'xior'

import { apiOrigin } from './environment'

export const apiClient = xior.create({
  baseURL: new URL('/api/v1', apiOrigin).toString(),
  credentials: 'include',
  timeout: 10_000,
})
