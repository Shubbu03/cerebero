import { z } from 'zod'

export const apiErrorCodeSchema = z.enum([
  'AUTH_UNAVAILABLE',
  'DUPLICATE_ITEM',
  'EDIT_CONFLICT',
  'INTERNAL_ERROR',
  'INVALID_REQUEST',
  'INVALID_ITEM_STATE',
  'NOT_FOUND',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE',
  'UNAUTHENTICATED',
  'UNSUPPORTED_MEDIA_TYPE',
])

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
})

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
