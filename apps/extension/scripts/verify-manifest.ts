import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'

const EXPECTED_EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email'
const EXPECTED_DESCRIPTION =
  'Save the current page to your private Cerebero Library from the popup or right-click menu.'
const EXPECTED_HOMEPAGE = 'https://cerebero.shubbu.dev/'
const EXPECTED_ICONS = {
  16: 'icon/16.png',
  32: 'icon/32.png',
  48: 'icon/48.png',
  96: 'icon/96.png',
  128: 'icon/128.png',
} as const
const EXPECTED_PERMISSIONS = [
  'activeTab',
  'contextMenus',
  'identity',
  'storage',
]
const releaseVerification = process.argv.includes('--release')

const manifestSchema = z.strictObject({
  action: z.strictObject({
    default_icon: z.strictObject({
      '16': z.literal(EXPECTED_ICONS[16]),
      '32': z.literal(EXPECTED_ICONS[32]),
      '48': z.literal(EXPECTED_ICONS[48]),
      '128': z.literal(EXPECTED_ICONS[128]),
    }),
    default_popup: z.literal('popup.html'),
    default_title: z.literal('Cerebero'),
  }),
  background: z.strictObject({
    service_worker: z.literal('background.js'),
  }),
  description: z.literal(EXPECTED_DESCRIPTION),
  homepage_url: z.literal(EXPECTED_HOMEPAGE),
  host_permissions: z.array(z.string()).length(1),
  icons: z.strictObject({
    '16': z.literal(EXPECTED_ICONS[16]),
    '32': z.literal(EXPECTED_ICONS[32]),
    '48': z.literal(EXPECTED_ICONS[48]),
    '96': z.literal(EXPECTED_ICONS[96]),
    '128': z.literal(EXPECTED_ICONS[128]),
  }),
  key: z.string().min(100).optional(),
  manifest_version: z.literal(3),
  name: z.literal('Cerebero'),
  oauth2: z.strictObject({
    client_id: z.string().min(1),
    scopes: z.tuple([z.literal(EXPECTED_EMAIL_SCOPE)]),
  }),
  permissions: z.array(z.string()),
  version: z.string().min(1),
})

const manifestFile = new URL(
  '../.output/chrome-mv3/manifest.json',
  import.meta.url,
)
const rawManifest: unknown = JSON.parse(
  await readFile(fileURLToPath(manifestFile), 'utf8'),
)
const manifest = manifestSchema.parse(rawManifest)

function extensionIdFromPublicKey(publicKey: string): string {
  const digest = createHash('sha256')
    .update(Buffer.from(publicKey, 'base64'))
    .digest()
    .subarray(0, 16)
  return [...digest]
    .flatMap((byte) => [byte >> 4, byte & 0x0f])
    .map((nibble) => String.fromCharCode('a'.charCodeAt(0) + nibble))
    .join('')
}

const permissions = [...manifest.permissions].sort()
if (JSON.stringify(permissions) !== JSON.stringify(EXPECTED_PERMISSIONS)) {
  throw new Error(
    `Unexpected extension permissions: ${permissions.join(', ') || 'none'}`,
  )
}

const configuredClient = !manifest.oauth2.client_id.includes('not-configured')
if (releaseVerification && !configuredClient) {
  throw new Error(
    'WXT_GOOGLE_CLIENT_ID is required for a release extension artifact.',
  )
}

if (releaseVerification && !manifest.key) {
  throw new Error(
    'WXT_EXTENSION_PUBLIC_KEY is required for a release extension artifact so the extension ID stays stable.',
  )
}

if (releaseVerification && manifest.key) {
  const expectedExtensionId = process.env.WXT_EXTENSION_ID?.trim()
  if (!expectedExtensionId?.match(/^[a-p]{32}$/)) {
    throw new Error(
      'WXT_EXTENSION_ID must be the stable 32-character ID from the Chrome Web Store draft.',
    )
  }

  const derivedExtensionId = extensionIdFromPublicKey(manifest.key)
  if (derivedExtensionId !== expectedExtensionId) {
    throw new Error(
      `The manifest public key derives ${derivedExtensionId}, not the configured extension ID ${expectedExtensionId}.`,
    )
  }
}

const [hostPermission] = manifest.host_permissions
if (!hostPermission) {
  throw new Error('The API host permission is missing.')
}

const apiHost = new URL(hostPermission)
if (
  !['http:', 'https:'].includes(apiHost.protocol) ||
  apiHost.pathname !== '/*'
) {
  throw new Error(`Invalid API host permission: ${apiHost.toString()}`)
}

if (releaseVerification && apiHost.protocol !== 'https:') {
  throw new Error('A release extension must use an HTTPS API host permission.')
}

if (releaseVerification) {
  const webOrigin = process.env.WXT_WEB_ORIGIN?.trim()
  if (!webOrigin || new URL(webOrigin).protocol !== 'https:') {
    throw new Error(
      'WXT_WEB_ORIGIN must be configured with the production HTTPS dashboard origin for a release artifact.',
    )
  }
}

console.info(
  `Verified ${releaseVerification ? 'release ' : ''}MV3 manifest: ${permissions.join(', ')}; ${apiHost.toString()}`,
)
