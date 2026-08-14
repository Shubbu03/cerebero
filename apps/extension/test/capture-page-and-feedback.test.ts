import { describe, expect, it } from 'vitest'

import { captureActionFeedback } from '../src/capture/action-feedback'
import { capturePageFromTab } from '../src/capture/capture-page'

describe('Capture page boundary and action feedback', () => {
  it('accepts regular web pages, permits missing titles, and rejects browser pages', () => {
    expect(
      capturePageFromTab({ title: '  Example  ', url: 'https://example.com' }),
    ).toEqual({ title: 'Example', url: 'https://example.com' })
    expect(capturePageFromTab({ url: 'https://example.com' })).toEqual({
      title: null,
      url: 'https://example.com',
    })
    expect(
      capturePageFromTab({
        title: 'x'.repeat(400),
        url: 'https://example.com',
      })?.title,
    ).toHaveLength(300)
    expect(capturePageFromTab({ url: 'chrome://extensions' })).toBeNull()
    expect(capturePageFromTab({ url: 'file:///tmp/private.txt' })).toBeNull()
  })

  it('uses short, non-notification action states for Quick Capture outcomes', () => {
    expect(
      captureActionFeedback({ status: 'authentication-required' }),
    ).toMatchObject({ badgeText: '!', clearAfterMs: null })
    expect(
      captureActionFeedback({ candidates: [], status: 'duplicate' }),
    ).toMatchObject({ badgeText: '=', clearAfterMs: 4_000 })
    expect(
      captureActionFeedback({
        code: 'network',
        message: 'Offline.',
        status: 'failed',
      }),
    ).toMatchObject({ badgeText: '!', title: 'Offline.' })
  })
})
