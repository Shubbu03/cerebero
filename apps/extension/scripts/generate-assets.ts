import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const faviconPath = resolve(extensionRoot, '../web/public/favicon.svg')
const brandingDirectory = resolve(extensionRoot, 'assets/branding')
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

function screenshotShell({
  headline,
  popup,
  subline,
}: {
  headline: string[]
  popup: string
  subline: string
}): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
      <defs>
        <radialGradient id="glow" cx="74%" cy="45%" r="58%">
          <stop offset="0" stop-color="#183122" />
          <stop offset="1" stop-color="${palette.canvas}" />
        </radialGradient>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.38" />
        </filter>
      </defs>
      <rect width="1280" height="800" fill="url(#glow)" />
      ${brandMark(72, 64, 54)}
      <text x="144" y="102" fill="${palette.primary}" font-family="Georgia, serif"
        font-size="34" font-weight="700">Cerebero</text>
      ${headline
        .map(
          (line, index) =>
            `<text x="72" y="${300 + index * 68}" fill="${palette.primary}" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700">${line}</text>`,
        )
        .join('')}
      <text x="72" y="${330 + headline.length * 68}" fill="#abb6af"
        font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="500">${subline}</text>
      <g filter="url(#shadow)">
        <rect x="744" y="48" width="464" height="704" rx="18" fill="${palette.canvas}"
          stroke="${palette.stroke}" stroke-width="2" />
        ${brandMark(772, 74, 40)}
        <text x="826" y="104" fill="${palette.primary}" font-family="Georgia, serif"
          font-size="25" font-weight="700">Cerebero</text>
        <text x="1176" y="101" fill="${palette.muted}" font-family="monospace"
          font-size="12" text-anchor="end" letter-spacing="2">Extension</text>
        <line x1="744" y1="132" x2="1208" y2="132" stroke="${palette.stroke}" />
        ${popup}
      </g>
    </svg>
  `
}

function signedOutPopup(): string {
  return `
    <text x="776" y="214" fill="${palette.primary}" font-family="Georgia, serif"
      font-size="39" font-weight="500">Your Library,</text>
    <text x="776" y="258" fill="${palette.primary}" font-family="Georgia, serif"
      font-size="39" font-weight="500">one click away.</text>
    <text x="776" y="304" fill="#a6b1aa" font-family="Arial, Helvetica, sans-serif"
      font-size="17">Connect the same Google account you use</text>
    <text x="776" y="330" fill="#a6b1aa" font-family="Arial, Helvetica, sans-serif"
      font-size="17">for Cerebero.</text>
    <rect x="776" y="376" width="400" height="56" rx="10" fill="${palette.accent}" />
    <circle cx="816" cy="404" r="12" fill="none" stroke="${palette.canvas}" stroke-width="3" />
    <path d="M 816 392 A 12 12 0 0 1 827 398" fill="none" stroke="${palette.canvas}" stroke-width="3" />
    <text x="976" y="411" fill="${palette.canvas}" font-family="Arial, Helvetica, sans-serif"
      font-size="17" font-weight="700" text-anchor="middle">Sign in with Google  →</text>
    <text x="776" y="478" fill="${palette.muted}" font-family="monospace" font-size="12">
      Your Google token is never stored.
    </text>
  `
}

function capturePopup(): string {
  return `
    <rect x="776" y="166" width="40" height="40" rx="9" fill="${palette.canvasSoft}" />
    <path d="M 788 186 L 795 179 A 6 6 0 0 1 804 188 L 796 196 A 6 6 0 0 1 787 187"
      fill="none" stroke="#aeb9b2" stroke-width="2.5" stroke-linecap="round" />
    <text x="832" y="190" fill="${palette.primary}" font-family="Georgia, serif"
      font-size="30" font-weight="500">Save this page.</text>
    <text x="832" y="212" fill="${palette.muted}" font-family="monospace" font-size="11">
      https://example.com/useful-essay
    </text>
    <text x="776" y="254" fill="${palette.primary}" font-family="Arial, Helvetica, sans-serif"
      font-size="13" font-weight="700">Title</text>
    <rect x="776" y="266" width="400" height="48" rx="9" fill="#07100c" stroke="${palette.stroke}" />
    <text x="792" y="296" fill="${palette.primary}" font-family="Arial, Helvetica, sans-serif" font-size="15">
      A useful essay
    </text>
    <text x="776" y="348" fill="${palette.primary}" font-family="Arial, Helvetica, sans-serif"
      font-size="13" font-weight="700">Note <tspan fill="${palette.muted}" font-weight="400">optional</tspan></text>
    <rect x="776" y="360" width="400" height="134" rx="9" fill="#07100c" stroke="${palette.stroke}" />
    <text x="792" y="390" fill="#a6b1aa" font-family="Arial, Helvetica, sans-serif" font-size="15">
      Worth revisiting for the section on focus.
    </text>
    <rect x="776" y="528" width="400" height="54" rx="10" fill="${palette.accent}" />
    <text x="976" y="562" fill="${palette.canvas}" font-family="Arial, Helvetica, sans-serif"
      font-size="17" font-weight="700" text-anchor="middle">Save to Library</text>
    <line x1="744" y1="670" x2="1208" y2="670" stroke="${palette.stroke}" />
    <text x="776" y="708" fill="${palette.muted}" font-family="monospace" font-size="11">
      shubham@example.com
    </text>
  `
}

function capturedPopup(): string {
  return `
    <rect x="776" y="176" width="400" height="290" rx="14" fill="${palette.canvasRaised}"
      stroke="${palette.stroke}" />
    <circle cx="808" cy="212" r="13" fill="${palette.accent}" />
    <path d="M 801 212 L 806 217 L 816 207" fill="none" stroke="${palette.canvas}"
      stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <text x="800" y="275" fill="${palette.primary}" font-family="Georgia, serif"
      font-size="32" font-weight="500">Saved to your Library.</text>
    <text x="800" y="320" fill="#a6b1aa" font-family="Arial, Helvetica, sans-serif"
      font-size="16">A useful essay</text>
    <text x="800" y="406" fill="${palette.accent}" font-family="Arial, Helvetica, sans-serif"
      font-size="15" font-weight="700">View Item  ↗</text>
    <text x="1148" y="406" fill="#a6b1aa" font-family="Arial, Helvetica, sans-serif"
      font-size="14" font-weight="600" text-anchor="end">Capture another</text>
    <line x1="744" y1="670" x2="1208" y2="670" stroke="${palette.stroke}" />
    <text x="776" y="708" fill="${palette.muted}" font-family="monospace" font-size="11">
      shubham@example.com
    </text>
  `
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

async function writeJpeg(svg: string, path: string): Promise<void> {
  await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toFile(path)
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
  writeJpeg(
    screenshotShell({
      headline: ['Your Library,', 'one click away.'],
      popup: signedOutPopup(),
      subline: 'Connect once with the Google account you already use.',
    }),
    resolve(screenshotDirectory, 'cerebero-store-1.jpg'),
  ),
  writeJpeg(
    screenshotShell({
      headline: ['Capture without', 'breaking focus.'],
      popup: capturePopup(),
      subline: 'Keep the page, title, and the note that gives it context.',
    }),
    resolve(screenshotDirectory, 'cerebero-store-2.jpg'),
  ),
  writeJpeg(
    screenshotShell({
      headline: ['Saved now.', 'Ready later.'],
      popup: capturedPopup(),
      subline: 'Send the page straight to your private Cerebero Library.',
    }),
    resolve(screenshotDirectory, 'cerebero-store-3.jpg'),
  ),
])

console.info(
  `Generated Cerebero extension icons and store assets in ${extensionRoot}`,
)
