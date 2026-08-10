import xior from 'xior'
import { encodeParams } from 'xior/utils'

import { apiOrigin } from './environment'

export const apiClient = xior.create({
  baseURL: new URL('/api/v1', apiOrigin).toString(),
  credentials: 'include',
  paramsSerializer: (params) =>
    encodeParams(params, true, null, { arrayFormat: 'repeat' }),
  timeout: 10_000,
})
