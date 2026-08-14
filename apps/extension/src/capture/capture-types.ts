import {
  MAX_ITEM_TITLE_LENGTH,
  duplicateCandidateSchema,
  duplicateCheckInputSchema,
  itemViewSchema,
  type CaptureItemInput,
  type DuplicateCandidate,
  type ItemView,
} from '@cerebero/contracts'
import { z } from 'zod'

export const capturePageSchema = z.strictObject({
  title: z.string().trim().max(MAX_ITEM_TITLE_LENGTH).nullable(),
  url: duplicateCheckInputSchema.shape.url,
})

export const pendingCaptureSchema = capturePageSchema.extend({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
})

export const captureDraftSchema = capturePageSchema.extend({
  pendingCaptureId: z.uuid().nullable(),
  source: z.enum(['active-page', 'pending-context-menu']),
})

export const captureDraftResponseSchema = z.discriminatedUnion('status', [
  z.strictObject({
    draft: captureDraftSchema,
    status: z.literal('ready'),
  }),
  z.strictObject({
    message: z.string().min(1),
    status: z.literal('unsupported-page'),
  }),
])

export const captureFailureCodeSchema = z.enum([
  'invalid-page',
  'network',
  'rate-limited',
  'unknown',
])

export const captureAttemptResponseSchema = z.discriminatedUnion('status', [
  z.strictObject({
    item: itemViewSchema,
    status: z.literal('captured'),
  }),
  z.strictObject({
    candidates: z.array(duplicateCandidateSchema).max(10),
    status: z.literal('duplicate'),
  }),
  z.strictObject({ status: z.literal('authentication-required') }),
  z.strictObject({
    code: captureFailureCodeSchema,
    message: z.string().min(1),
    status: z.literal('failed'),
  }),
])

export type CapturePage = z.infer<typeof capturePageSchema>
export type PendingCapture = z.infer<typeof pendingCaptureSchema>
export type CaptureDraft = z.infer<typeof captureDraftSchema>
export type CaptureDraftResponse = z.infer<typeof captureDraftResponseSchema>
export type CaptureAttemptResponse = z.infer<
  typeof captureAttemptResponseSchema
>

export type CaptureApiResult =
  | { item: ItemView; outcome: 'captured' }
  | { candidates: DuplicateCandidate[]; outcome: 'duplicate' }

export interface ExtensionCaptureApi {
  capture(token: string, input: CaptureItemInput): Promise<CaptureApiResult>
  checkDuplicates(token: string, url: string): Promise<DuplicateCandidate[]>
}

export interface PendingCaptureStore {
  clear(): Promise<void>
  read(): Promise<PendingCapture | null>
  write(page: CapturePage): Promise<PendingCapture>
}

export interface ExtensionCaptureController {
  captureQuick(page: CapturePage): Promise<CaptureAttemptResponse>
  captureReviewed(input: {
    allowDuplicate: boolean
    authoredTitle: string | null
    noteMarkdown: string | null
    originalUrl: string
    pendingCaptureId: string | null
  }): Promise<CaptureAttemptResponse>
  clearPendingCapture(id: string): Promise<void>
  getDraft(activePage: CapturePage | null): Promise<CaptureDraftResponse>
}
