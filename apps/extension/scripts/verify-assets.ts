import { access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const expectedAssets = [
  ['assets/branding/cerebero-icon-master.png', 1_024, 1_024],
  ['public/icon/16.png', 16, 16],
  ['public/icon/32.png', 32, 32],
  ['public/icon/48.png', 48, 48],
  ['public/icon/96.png', 96, 96],
  ['public/icon/128.png', 128, 128],
  ['store-assets/small-promo.png', 440, 280],
  ['store-assets/screenshots/cerebero-store-1.jpg', 1_280, 800],
  ['store-assets/screenshots/cerebero-store-2.jpg', 1_280, 800],
  ['store-assets/screenshots/cerebero-store-3.jpg', 1_280, 800],
  ['store-assets/screenshots/cerebero-store-4.jpg', 1_280, 800],
] as const

await Promise.all(
  expectedAssets.map(async ([relativePath, expectedWidth, expectedHeight]) => {
    const path = resolve(extensionRoot, relativePath)
    await access(path)
    const metadata = await sharp(path).metadata()
    if (
      metadata.width !== expectedWidth ||
      metadata.height !== expectedHeight
    ) {
      throw new Error(
        `${relativePath} is ${metadata.width ?? 'unknown'}x${metadata.height ?? 'unknown'}; expected ${expectedWidth}x${expectedHeight}.`,
      )
    }
  }),
)

console.info(`Verified ${expectedAssets.length} extension release assets.`)
