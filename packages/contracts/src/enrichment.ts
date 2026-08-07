import { z } from 'zod'

export const ENRICHMENT_ERROR_CODES = [
  'blocked_unsafe_url',
  'invalid_metadata',
  'lease_expired',
  'response_too_large',
  'timed_out',
  'unavailable',
  'unsupported_content',
] as const

export const enrichmentErrorCodeSchema = z.enum(ENRICHMENT_ERROR_CODES)
export const enrichmentStateSchema = z.enum([
  'pending',
  'processing',
  'succeeded',
  'retryable_failed',
  'terminal_failed',
])

function isSafeMetadataUrl(value: string | null): boolean {
  if (!value) {
    return true
  }

  try {
    const url = new URL(value)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

const metadataUrlSchema = z
  .url()
  .max(2_048)
  .nullable()
  .refine(isSafeMetadataUrl)

export const enrichmentViewSchema = z
  .object({
    attemptCount: z.number().int().nonnegative(),
    canonicalUrl: metadataUrlSchema,
    description: z.string().min(1).max(2_000).nullable(),
    enrichedAt: z.iso.datetime().nullable(),
    extractedTitle: z.string().min(1).max(500).nullable(),
    faviconUrl: metadataUrlSchema,
    imageUrl: metadataUrlSchema,
    lastErrorCode: enrichmentErrorCodeSchema.nullable(),
    nextAttemptAt: z.iso.datetime().nullable(),
    provider: z.string().min(1).max(100).nullable(),
    siteName: z.string().min(1).max(200).nullable(),
    state: enrichmentStateSchema,
  })
  .strict()
  .superRefine((enrichment, context) => {
    const hasError = enrichment.lastErrorCode !== null
    const hasNextAttempt = enrichment.nextAttemptAt !== null
    const hasEnrichedAt = enrichment.enrichedAt !== null

    const valid =
      (enrichment.state === 'pending' &&
        !hasError &&
        hasNextAttempt &&
        !hasEnrichedAt) ||
      (enrichment.state === 'processing' &&
        !hasError &&
        !hasNextAttempt &&
        !hasEnrichedAt) ||
      (enrichment.state === 'succeeded' &&
        !hasError &&
        !hasNextAttempt &&
        hasEnrichedAt) ||
      (enrichment.state === 'retryable_failed' &&
        hasError &&
        hasNextAttempt &&
        !hasEnrichedAt) ||
      (enrichment.state === 'terminal_failed' &&
        hasError &&
        !hasNextAttempt &&
        !hasEnrichedAt)

    if (!valid) {
      context.addIssue({
        code: 'custom',
        message: 'The enrichment state fields are inconsistent.',
      })
    }
  })

export const enrichmentRetryResponseSchema = z
  .object({ enrichment: enrichmentViewSchema })
  .strict()

export type EnrichmentErrorCode = z.infer<typeof enrichmentErrorCodeSchema>
export type EnrichmentRetryResponse = z.infer<
  typeof enrichmentRetryResponseSchema
>
export type EnrichmentState = z.infer<typeof enrichmentStateSchema>
export type EnrichmentView = z.infer<typeof enrichmentViewSchema>
