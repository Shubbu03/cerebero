import { createHash, randomBytes } from 'node:crypto'

import type { TokenMaterial } from './share-types.js'

/** 256-bit opaque tokens encoded as base64url (43 characters). */
export const SHARE_TOKEN_BYTES = 32

export function hashShareToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function createShareTokenMaterial(
  createBytes: () => Buffer = () => randomBytes(SHARE_TOKEN_BYTES),
): TokenMaterial {
  const token = createBytes().toString('base64url')
  return {
    token,
    tokenHash: hashShareToken(token),
  }
}
