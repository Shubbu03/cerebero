import {
  MAX_ITEM_NOTE_LENGTH,
  MAX_ITEM_TITLE_LENGTH,
  duplicateCheckInputSchema,
} from '@cerebero/contracts'
import { z } from 'zod'
import { browser } from 'wxt/browser'

import { capturePageFromTab } from '../capture/capture-page'
import {
  captureAttemptResponseSchema,
  captureDraftResponseSchema,
  type CaptureAttemptResponse,
  type CaptureDraftResponse,
  type ExtensionCaptureController,
} from '../capture/capture-types'

const reviewedCaptureInputSchema = z.strictObject({
  allowDuplicate: z.boolean(),
  authoredTitle: z.string().max(MAX_ITEM_TITLE_LENGTH).nullable(),
  noteMarkdown: z.string().max(MAX_ITEM_NOTE_LENGTH).nullable(),
  originalUrl: duplicateCheckInputSchema.shape.url,
  pendingCaptureId: z.uuid().nullable(),
})

export const captureMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('capture:get-draft') }),
  z.strictObject({
    input: reviewedCaptureInputSchema,
    type: z.literal('capture:reviewed'),
  }),
  z.strictObject({
    pendingCaptureId: z.uuid(),
    type: z.literal('capture:clear-pending'),
  }),
])

export type CaptureMessage = z.infer<typeof captureMessageSchema>

export type CapturePageProvider = () => Promise<
  ReturnType<typeof capturePageFromTab>
>

export const activeTabCapturePageProvider: CapturePageProvider = async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  return tab ? capturePageFromTab(tab) : null
}

export async function handleCaptureMessage(
  rawMessage: unknown,
  controller: ExtensionCaptureController,
  getActivePage: CapturePageProvider,
): Promise<CaptureAttemptResponse | CaptureDraftResponse | undefined> {
  const parsed = captureMessageSchema.safeParse(rawMessage)
  if (!parsed.success) {
    return undefined
  }

  switch (parsed.data.type) {
    case 'capture:get-draft':
      return controller.getDraft(await getActivePage())
    case 'capture:reviewed':
      return controller.captureReviewed(parsed.data.input)
    case 'capture:clear-pending':
      await controller.clearPendingCapture(parsed.data.pendingCaptureId)
      return controller.getDraft(await getActivePage())
  }
}

export async function sendCaptureDraftMessage(): Promise<CaptureDraftResponse> {
  const response: unknown = await browser.runtime.sendMessage({
    type: 'capture:get-draft',
  } satisfies CaptureMessage)
  return captureDraftResponseSchema.parse(response)
}

export async function sendReviewedCaptureMessage(
  input: Extract<CaptureMessage, { type: 'capture:reviewed' }>['input'],
): Promise<CaptureAttemptResponse> {
  const response: unknown = await browser.runtime.sendMessage({
    input,
    type: 'capture:reviewed',
  } satisfies CaptureMessage)
  return captureAttemptResponseSchema.parse(response)
}

export async function sendClearPendingCaptureMessage(
  pendingCaptureId: string,
): Promise<CaptureDraftResponse> {
  const response: unknown = await browser.runtime.sendMessage({
    pendingCaptureId,
    type: 'capture:clear-pending',
  } satisfies CaptureMessage)
  return captureDraftResponseSchema.parse(response)
}
