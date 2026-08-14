import { describe, expect, it, vi } from 'vitest'

import type { ExtensionCaptureController } from '../src/capture/capture-types'
import { handleCaptureMessage } from '../src/messaging/capture-messages'

describe('popup-to-background Capture messages', () => {
  it('routes only allowlisted, strictly shaped Capture messages', async () => {
    const captureReviewed = vi.fn().mockResolvedValue({
      status: 'authentication-required',
    })
    const controller: ExtensionCaptureController = {
      captureQuick: vi.fn(),
      captureReviewed,
      clearPendingCapture: vi.fn().mockResolvedValue(undefined),
      getDraft: vi.fn().mockResolvedValue({
        message: 'Unsupported.',
        status: 'unsupported-page',
      }),
    }
    const getPage = vi.fn().mockResolvedValue(null)

    await expect(
      handleCaptureMessage({ type: 'capture:get-draft' }, controller, getPage),
    ).resolves.toEqual({
      message: 'Unsupported.',
      status: 'unsupported-page',
    })
    await expect(
      handleCaptureMessage(
        {
          input: {
            allowDuplicate: false,
            authoredTitle: 'Example',
            noteMarkdown: null,
            originalUrl: 'https://example.com',
            pendingCaptureId: null,
          },
          type: 'capture:reviewed',
        },
        controller,
        getPage,
      ),
    ).resolves.toEqual({ status: 'authentication-required' })
    await expect(
      handleCaptureMessage(
        {
          input: {
            allowDuplicate: false,
            authoredTitle: 'Example',
            noteMarkdown: null,
            originalUrl: 'javascript:alert(1)',
            pendingCaptureId: null,
          },
          type: 'capture:reviewed',
        },
        controller,
        getPage,
      ),
    ).resolves.toBeUndefined()
    await expect(
      handleCaptureMessage(
        { token: 'attacker-token', type: 'capture:get-draft' },
        controller,
        getPage,
      ),
    ).resolves.toBeUndefined()

    expect(captureReviewed).toHaveBeenCalledOnce()
  })
})
