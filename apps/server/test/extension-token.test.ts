import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  createExtensionTokenMaterial,
  hashExtensionToken,
  isExtensionToken,
} from '../src/modules/extension-auth/token.js'

describe('Extension Session tokens', () => {
  it('creates an opaque token and stores only its SHA-256 digest', () => {
    const material = createExtensionTokenMaterial(() => Buffer.alloc(32, 7))

    expect(material.token).toMatch(/^cer_ext_[A-Za-z0-9_-]{43}$/)
    expect(material.tokenHash).toBe(
      createHash('sha256').update(material.token).digest('hex'),
    )
    expect(material.tokenHash).not.toContain(material.token)
    expect(isExtensionToken(material.token)).toBe(true)
  })

  it('rejects malformed and truncated bearer values', () => {
    expect(isExtensionToken('cer_ext_short')).toBe(false)
    expect(isExtensionToken(`wrong_${'a'.repeat(43)}`)).toBe(false)
    expect(hashExtensionToken('same-token')).toBe(
      hashExtensionToken('same-token'),
    )
  })
})
