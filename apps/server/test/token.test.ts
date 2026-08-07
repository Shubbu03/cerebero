import { describe, expect, it } from 'vitest'

import {
  createShareTokenMaterial,
  hashShareToken,
  SHARE_TOKEN_BYTES,
} from '../src/modules/sharing/token.js'

describe('Share token material', () => {
  it('generates high-entropy opaque tokens and stores only digests', () => {
    const first = createShareTokenMaterial()
    const second = createShareTokenMaterial()

    expect(first.token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(first.token.length).toBeGreaterThanOrEqual(43)
    expect(first.token).not.toBe(second.token)
    expect(first.tokenHash).toBe(hashShareToken(first.token))
    expect(first.tokenHash).toHaveLength(64)
    expect(first.tokenHash).not.toContain(first.token)

    const fixed = createShareTokenMaterial(() => Buffer.alloc(SHARE_TOKEN_BYTES, 7))
    expect(fixed.tokenHash).toBe(hashShareToken(fixed.token))
  })
})
