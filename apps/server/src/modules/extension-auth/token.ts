import { createHash, randomBytes } from 'node:crypto'

export const EXTENSION_TOKEN_BYTES = 32
export const EXTENSION_TOKEN_PREFIX = 'cer_ext_'

export type ExtensionTokenMaterial = {
  token: string
  tokenHash: string
}

export function hashExtensionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function isExtensionToken(token: string): boolean {
  return /^cer_ext_[A-Za-z0-9_-]{43}$/.test(token)
}

export function createExtensionTokenMaterial(
  createBytes: () => Buffer = () => randomBytes(EXTENSION_TOKEN_BYTES),
): ExtensionTokenMaterial {
  const token = `${EXTENSION_TOKEN_PREFIX}${createBytes().toString('base64url')}`
  return {
    token,
    tokenHash: hashExtensionToken(token),
  }
}
