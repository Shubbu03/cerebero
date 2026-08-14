import { captureItemInputSchema } from '@cerebero/contracts'

import type { ExtensionAuthenticationStore } from '../auth/auth-types'
import { ExtensionApiError } from '../lib/extension-api'
import {
  capturePageSchema,
  type CaptureAttemptResponse,
  type CapturePage,
  type ExtensionCaptureApi,
  type ExtensionCaptureController,
  type PendingCaptureStore,
} from './capture-types'

type CaptureControllerOptions = {
  api: ExtensionCaptureApi
  authenticationStore: ExtensionAuthenticationStore
  clock?: () => Date
  pendingStore: PendingCaptureStore
}

type AuthenticatedRecord = Extract<
  Awaited<ReturnType<ExtensionAuthenticationStore['read']>>,
  { status: 'authenticated' }
>

function failedCapture(error: unknown): CaptureAttemptResponse {
  if (error instanceof ExtensionApiError) {
    if (error.code === 'network' || error.code === 'SERVICE_UNAVAILABLE') {
      return {
        code: 'network',
        message: 'Cerebero could not be reached. Check your connection.',
        status: 'failed',
      }
    }

    if (error.code === 'RATE_LIMITED') {
      return {
        code: 'rate-limited',
        message: 'Too many Capture requests. Wait a moment and try again.',
        status: 'failed',
      }
    }
  }

  return {
    code: 'unknown',
    message: 'This page could not be saved. Try again.',
    status: 'failed',
  }
}

export function createCaptureController(
  options: CaptureControllerOptions,
): ExtensionCaptureController {
  const clock = options.clock ?? (() => new Date())
  const activeOperations = new Map<string, Promise<CaptureAttemptResponse>>()

  async function authenticatedRecord(): Promise<AuthenticatedRecord | null> {
    const record = await options.authenticationStore.read()
    if (!record || record.status !== 'authenticated') {
      return null
    }

    if (Date.parse(record.session.expiresAt) <= clock().getTime()) {
      await options.authenticationStore.writeExpired(record.session)
      return null
    }

    return record
  }

  async function expireAuthentication(record: AuthenticatedRecord) {
    await options.authenticationStore.writeExpired(record.session)
  }

  function runOnce(
    key: string,
    operation: () => Promise<CaptureAttemptResponse>,
  ): Promise<CaptureAttemptResponse> {
    const running = activeOperations.get(key)
    if (running) {
      return running
    }

    const promise = operation().finally(() => {
      if (activeOperations.get(key) === promise) {
        activeOperations.delete(key)
      }
    })
    activeOperations.set(key, promise)
    return promise
  }

  async function detectAndCapture(optionsForCapture: {
    allowDuplicate: boolean
    authoredTitle: string | null
    noteMarkdown: string | null
    originalUrl: string
    record: AuthenticatedRecord
  }): Promise<CaptureAttemptResponse> {
    const input = captureItemInputSchema.parse({
      allowDuplicate: optionsForCapture.allowDuplicate,
      authoredTitle: optionsForCapture.authoredTitle,
      noteMarkdown: optionsForCapture.noteMarkdown,
      originalUrl: optionsForCapture.originalUrl,
    })

    try {
      if (!optionsForCapture.allowDuplicate) {
        const candidates = await options.api.checkDuplicates(
          optionsForCapture.record.token,
          optionsForCapture.originalUrl,
        )
        if (candidates.length > 0) {
          return { candidates, status: 'duplicate' }
        }
      }

      const result = await options.api.capture(
        optionsForCapture.record.token,
        input,
      )
      return result.outcome === 'captured'
        ? { item: result.item, status: 'captured' }
        : { candidates: result.candidates, status: 'duplicate' }
    } catch (error) {
      if (
        error instanceof ExtensionApiError &&
        (error.code === 'UNAUTHENTICATED' || error.code === 'FORBIDDEN')
      ) {
        await expireAuthentication(optionsForCapture.record)
        return { status: 'authentication-required' }
      }
      return failedCapture(error)
    }
  }

  return {
    getDraft: async (activePage) => {
      const pending = await options.pendingStore.read()
      if (pending) {
        return {
          draft: {
            pendingCaptureId: pending.id,
            source: 'pending-context-menu',
            title: pending.title,
            url: pending.url,
          },
          status: 'ready',
        }
      }

      if (!activePage) {
        return {
          message: 'Chrome does not allow this page to be saved.',
          status: 'unsupported-page',
        }
      }

      const page = capturePageSchema.parse(activePage)
      return {
        draft: {
          pendingCaptureId: null,
          source: 'active-page',
          ...page,
        },
        status: 'ready',
      }
    },

    clearPendingCapture: async (id) => {
      const pending = await options.pendingStore.read()
      if (pending?.id === id) {
        await options.pendingStore.clear()
      }
    },

    captureReviewed: async (rawInput) => {
      const page = capturePageSchema.safeParse({
        title: rawInput.authoredTitle,
        url: rawInput.originalUrl,
      })
      if (!page.success) {
        return {
          code: 'invalid-page',
          message: 'Enter a valid HTTP or HTTPS page URL.',
          status: 'failed',
        }
      }

      const key = JSON.stringify(['reviewed', rawInput])
      return runOnce(key, async () => {
        const record = await authenticatedRecord()
        if (!record) {
          return { status: 'authentication-required' }
        }

        const result = await detectAndCapture({
          allowDuplicate: rawInput.allowDuplicate,
          authoredTitle: rawInput.authoredTitle?.trim() || null,
          noteMarkdown: rawInput.noteMarkdown || null,
          originalUrl: page.data.url,
          record,
        })

        if (
          result.status === 'captured' &&
          rawInput.pendingCaptureId !== null
        ) {
          const pending = await options.pendingStore.read()
          if (pending?.id === rawInput.pendingCaptureId) {
            await options.pendingStore.clear()
          }
        }
        return result
      })
    },

    captureQuick: async (rawPage: CapturePage) => {
      const parsedPage = capturePageSchema.safeParse(rawPage)
      if (!parsedPage.success) {
        return {
          code: 'invalid-page',
          message: 'Chrome does not allow this page to be saved.',
          status: 'failed',
        }
      }

      return runOnce(`quick:${parsedPage.data.url}`, async () => {
        const record = await authenticatedRecord()
        if (!record) {
          await options.pendingStore.write(parsedPage.data)
          return { status: 'authentication-required' }
        }

        const result = await detectAndCapture({
          allowDuplicate: false,
          authoredTitle: parsedPage.data.title,
          noteMarkdown: null,
          originalUrl: parsedPage.data.url,
          record,
        })

        if (result.status === 'authentication-required') {
          await options.pendingStore.write(parsedPage.data)
        }
        return result
      })
    },
  }
}
