import { apiErrorSchema } from '@cerebero/contracts'
import { isXiorError } from 'xior/utils'

import { TagMutationError } from './tag-mutation-error'

export function parseTagMutationError(error: unknown): TagMutationError {
  if (error instanceof TagMutationError) {
    return error
  }

  if (!isXiorError(error) || !error.response) {
    return new TagMutationError(
      'unavailable',
      'The Tag request could not be completed. Try again.',
    )
  }

  const parsed = apiErrorSchema.safeParse(error.response.data)
  const message = parsed.success
    ? parsed.data.error.message
    : 'The Tag request could not be completed. Try again.'
  const code = parsed.success ? parsed.data.error.code : null

  if (error.response.status === 409 || code === 'DUPLICATE_TAG') {
    return new TagMutationError(
      'duplicate',
      message || 'A Tag with this name already exists.',
    )
  }

  if (error.response.status === 404 || code === 'NOT_FOUND') {
    return new TagMutationError('not_found', message)
  }

  return new TagMutationError('unavailable', message)
}
