import { apiErrorSchema } from '@cerebero/contracts'
import { isXiorError } from 'xior/utils'

import {
  ItemMutationError,
  type ItemMutationErrorCode,
} from './item-mutation-error'

function fallbackMessage(code: ItemMutationErrorCode): string {
  switch (code) {
    case 'conflict':
      return 'This Item changed since it was loaded. Refresh and try again.'
    case 'invalid_state':
      return 'That action is not available for this Item right now.'
    case 'not_found':
      return 'The requested Item was not found.'
    case 'unavailable':
      return 'The request could not be completed. Try again.'
  }
}

export function parseItemMutationError(error: unknown): ItemMutationError {
  if (error instanceof ItemMutationError) {
    return error
  }

  if (!isXiorError(error) || !error.response) {
    return new ItemMutationError('unavailable', fallbackMessage('unavailable'))
  }

  const status = error.response.status
  const parsed = apiErrorSchema.safeParse(error.response.data)
  const message = parsed.success
    ? parsed.data.error.message
    : fallbackMessage('unavailable')
  const code = parsed.success ? parsed.data.error.code : null

  if (status === 404 || code === 'NOT_FOUND') {
    return new ItemMutationError('not_found', message)
  }

  if (status === 409 && code === 'EDIT_CONFLICT') {
    return new ItemMutationError('conflict', message)
  }

  if (status === 409 || code === 'INVALID_ITEM_STATE') {
    return new ItemMutationError('invalid_state', message)
  }

  return new ItemMutationError('unavailable', message)
}
