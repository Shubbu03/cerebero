import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const faviconPath = resolve(extensionRoot, '../web/public/favicon.svg')
const brandingDirectory = resolve(extensionRoot, 'assets/branding')
const storeSourceDirectory = resolve(extensionRoot, 'assets/store-sources')
const iconDirectory = resolve(extensionRoot, 'public/icon')
const screenshotDirectory = resolve(extensionRoot, 'store-assets/screenshots')
const storeAssetDirectory = resolve(extensionRoot, 'store-assets')

const ICON_SIZES = [16, 32, 48, 96, 128] as const
const MASTER_ICON_SIZE = 1_024
const MASTER_ART_SIZE = 768

const palette = {
  accent: '#c7f653',
  canvas: '#09100d',
  canvasRaised: '#0d1712',
  canvasSoft: '#101d16',
  muted: '#819087',
  primary: '#f3f0e8',
  stroke: '#2d4136',
} as const

function brandMark(x: number, y: number, size: number): string {
  const inset = size * 0.0625
  const corner = size * 0.21875
  const right = x + size - inset
  const bottom = y + size - inset
  return `
    <path d="M ${x + inset} ${y + inset} H ${right} V ${bottom - corner} L ${right - corner} ${bottom} H ${x + inset} Z"
      fill="${palette.primary}" stroke="${palette.stroke}" stroke-width="${Math.max(1, size * 0.035)}" />
    <text x="${x + size / 2}" y="${y + size / 2 + size * 0.04}"
      fill="${palette.canvas}" font-family="Arial, Helvetica, sans-serif"
      font-size="${size * 0.375}" font-weight="700" text-anchor="middle"
      dominant-baseline="middle">C</text>
  `
}

type StoreScreenshot = {
  eyebrow: string
  headline: [string, string]
  output: string
  source: string
  subline: [string, string]
}

const storeScreenshots: StoreScreenshot[] = [
  {
    eyebrow: 'Sign in once',
    headline: ['Your Library,', 'one click away.'],
    output: 'cerebero-store-1.jpg',
    source: 'signed-out.png',
    subline: [
      'Connect the same Google account',
      'you already use for Cerebero.',
    ],
  },
  {
    eyebrow: 'Capture with context',
    headline: ['Keep the page.', 'Keep the context.'],
    output: 'cerebero-store-2.jpg',
    source: 'capture.png',
    subline: [
      'Review the title and add a note',
      'before it reaches your Library.',
    ],
  },
  {
    eyebrow: 'Done without leaving the tab',
    headline: ['Saved now.', 'Ready later.'],
    output: 'cerebero-store-3.jpg',
    source: 'saved.png',
    subline: ['Open the Item in Cerebero,', 'or keep moving through your day.'],
  },
  {
    eyebrow: 'Clear by design',
    headline: ['Only saves', 'what you choose.'],
    output: 'cerebero-store-4.jpg',
    source: 'unsupported.png',
    subline: [
      'Browser-internal pages are rejected',
      'before anything is sent.',
    ],
  },
]

function storeScreenshotBackdrop({
  eyebrow,
  headline,
  index,
  screenshot,
  subline,
}: Omit<StoreScreenshot, 'output' | 'source'> & {
  index: number
  screenshot: { height: number; width: number; x: number; y: number }
}): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
      <defs>
        <radialGradient id="glow" cx="83%" cy="42%" r="76%">
          <stop offset="0" stop-color="#17291f" />
          <stop offset="0.55" stop-color="#0b1510" />
          <stop offset="1" stop-color="${palette.canvas}" />
        </radialGradient>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#274035" stroke-width="1" opacity="0.16" />
        </pattern>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#000" flood-opacity="0.48" />
        </filter>
      </defs>
      <rect width="1280" height="800" fill="url(#glow)" />
      <rect width="1280" height="800" fill="url(#grid)" />
      <path d="M 0 0 H 16 V 800 H 0 Z" fill="${palette.accent}" />
      ${brandMark(64, 52, 48)}
      <text x="126" y="87" fill="${palette.primary}" font-family="Georgia, serif"
        font-size="30" font-weight="700">Cerebero</text>
      <text x="64" y="225" fill="${palette.accent}" font-family="Arial, Helvetica, sans-serif"
        font-size="17" font-weight="700">${eyebrow}</text>
      <text x="64" y="317" fill="${palette.primary}" font-family="Georgia, serif"
        font-size="60" font-weight="600">${headline[0]}</text>
      <text x="64" y="384" fill="${palette.primary}" font-family="Georgia, serif"
        font-size="60" font-weight="600">${headline[1]}</text>
      <text x="64" y="466" fill="#a7b2ab" font-family="Arial, Helvetica, sans-serif"
        font-size="22">${subline[0]}</text>
      <text x="64" y="499" fill="#a7b2ab" font-family="Arial, Helvetica, sans-serif"
        font-size="22">${subline[1]}</text>
      <line x1="64" y1="690" x2="516" y2="690" stroke="${palette.stroke}" stroke-width="2" />
      <text x="64" y="730" fill="${palette.muted}" font-family="monospace" font-size="16"
        letter-spacing="2">0${index + 1} / 04</text>
      <rect x="${screenshot.x - 10}" y="${screenshot.y - 10}" width="${screenshot.width + 20}"
        height="${screenshot.height + 20}" rx="18" fill="#050806" opacity="0.85" filter="url(#shadow)" />
    </svg>
  `
}

function screenshotBorder({
  height,
  width,
  x,
  y,
}: {
  height: number
  width: number
  x: number
  y: number
}): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
      <rect x="${x - 1}" y="${y - 1}" width="${width + 2}" height="${height + 2}"
        fill="none" stroke="${palette.stroke}" stroke-width="2" />
    </svg>
  `
}

async function writeStoreScreenshot(
  screenshot: StoreScreenshot,
  index: number,
): Promise<void> {
  const source = await sharp(resolve(storeSourceDirectory, screenshot.source))
    .resize({
      fit: 'inside',
      height: 700,
      width: 610,
      withoutEnlargement: false,
    })
    .png()
    .toBuffer()
  const metadata = await sharp(source).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read ${screenshot.source} dimensions.`)
  }

  const placement = {
    height: metadata.height,
    width: metadata.width,
    x: 1280 - metadata.width - 42,
    y: Math.round((800 - metadata.height) / 2),
  }
  const backdrop = storeScreenshotBackdrop({
    eyebrow: screenshot.eyebrow,
    headline: screenshot.headline,
    index,
    screenshot: placement,
    subline: screenshot.subline,
  })

  await sharp(Buffer.from(backdrop))
    .composite([
      { input: source, left: placement.x, top: placement.y },
      { input: Buffer.from(screenshotBorder(placement)), left: 0, top: 0 },
    ])
    .jpeg({ chromaSubsampling: '4:4:4', quality: 94 })
    .toFile(resolve(screenshotDirectory, screenshot.output))
}

function smallPromoSvg(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
      <defs>
        <radialGradient id="glow" cx="75%" cy="25%" r="90%">
          <stop offset="0" stop-color="#183122" />
          <stop offset="1" stop-color="${palette.canvas}" />
        </radialGradient>
      </defs>
      <rect width="440" height="280" fill="url(#glow)" />
      ${brandMark(38, 34, 54)}
      <text x="108" y="72" fill="${palette.primary}" font-family="Georgia, serif"
        font-size="32" font-weight="700">Cerebero</text>
      <text x="38" y="163" fill="${palette.primary}" font-family="Arial, Helvetica, sans-serif"
        font-size="34" font-weight="700">Save now.</text>
      <text x="38" y="204" fill="${palette.primary}" font-family="Arial, Helvetica, sans-serif"
        font-size="34" font-weight="700">Find it later.</text>
      <rect x="38" y="235" width="120" height="4" rx="2" fill="${palette.accent}" />
    </svg>
  `
}

async function writePng(svg: string, path: string): Promise<void> {
  await sharp(Buffer.from(svg)).png().toFile(path)
}

await Promise.all([
  mkdir(brandingDirectory, { recursive: true }),
  mkdir(iconDirectory, { recursive: true }),
  mkdir(screenshotDirectory, { recursive: true }),
])

const favicon = await readFile(faviconPath)
const faviconArtwork = await sharp(favicon, { density: 384 })
  .resize(MASTER_ART_SIZE, MASTER_ART_SIZE)
  .png()
  .toBuffer()
const masterIcon = await sharp({
  create: {
    background: { alpha: 0, b: 0, g: 0, r: 0 },
    channels: 4,
    height: MASTER_ICON_SIZE,
    width: MASTER_ICON_SIZE,
  },
})
  .composite([
    {
      input: faviconArtwork,
      left: (MASTER_ICON_SIZE - MASTER_ART_SIZE) / 2,
      top: (MASTER_ICON_SIZE - MASTER_ART_SIZE) / 2,
    },
  ])
  .png()
  .toBuffer()

await sharp(masterIcon).toFile(
  resolve(brandingDirectory, 'cerebero-icon-master.png'),
)
await Promise.all(
  ICON_SIZES.map((size) =>
    sharp(masterIcon)
      .resize(size, size)
      .png()
      .toFile(resolve(iconDirectory, `${size}.png`)),
  ),
)

await Promise.all([
  writePng(smallPromoSvg(), resolve(storeAssetDirectory, 'small-promo.png')),
  ...storeScreenshots.map(writeStoreScreenshot),
])

console.info(
  `Generated Cerebero extension icons and store assets in ${extensionRoot}`,
)
