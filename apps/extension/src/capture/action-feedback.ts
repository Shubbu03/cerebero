import type { CaptureAttemptResponse } from './capture-types'

export type CaptureActionFeedback = {
  badgeColor: string
  badgeText: string
  clearAfterMs: number | null
  title: string
}

export function captureActionFeedback(
  result: CaptureAttemptResponse,
): CaptureActionFeedback {
  switch (result.status) {
    case 'captured':
      return {
        badgeColor: '#9fd92a',
        badgeText: '✓',
        clearAfterMs: 4_000,
        title: 'Saved to Cerebero',
      }
    case 'duplicate':
      return {
        badgeColor: '#d6a63a',
        badgeText: '=',
        clearAfterMs: 4_000,
        title: 'Already in Cerebero',
      }
    case 'authentication-required':
      return {
        badgeColor: '#d6a63a',
        badgeText: '!',
        clearAfterMs: null,
        title: 'Open Cerebero to sign in and confirm this Capture',
      }
    case 'failed':
      return {
        badgeColor: '#c95951',
        badgeText: '!',
        clearAfterMs: 5_000,
        title: result.message,
      }
  }
}
