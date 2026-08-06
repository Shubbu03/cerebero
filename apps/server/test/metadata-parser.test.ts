import { describe, expect, it } from 'vitest'

import {
  MetadataParserError,
  metadataParser,
} from '../src/modules/enrichment/metadata-parser.js'

const encoder = new TextEncoder()

function parse(html: string, documentUrl = 'https://example.com/articles/one') {
  return metadataParser.parse({
    body: encoder.encode(html),
    contentType: 'text/html',
    documentUrl,
  })
}

describe('Enrichment metadata parser', () => {
  it('extracts the fixed allowlist with explicit precedence and relative URLs', () => {
    const metadata = parse(`
      <!doctype html>
      <html>
        <head>
          <base href="https://static.example.com/content/">
          <title>Fallback &amp; title</title>
          <meta name="description" content="Fallback description">
          <meta name="twitter:title" content="Twitter title">
          <meta property="og:title" content="Open Graph &amp; title">
          <meta property="og:title" content="Ignored duplicate">
          <meta property="og:description" content="  Primary\n description  ">
          <meta property="og:site_name" content="Example News">
          <meta property="og:type" content="article">
          <meta property="og:image:secure_url" content="http://127.0.0.1/private.png">
          <meta property="og:image" content="images/preview.png#fragment">
          <link rel="canonical" href="../canonical#section">
          <link rel="shortcut icon" href="/favicon.ico">
        </head>
      </html>
    `)

    expect(metadata).toEqual({
      canonicalUrl: 'https://static.example.com/canonical',
      description: 'Primary description',
      extractedTitle: 'Open Graph & title',
      faviconUrl: 'https://static.example.com/favicon.ico',
      imageUrl: 'https://static.example.com/content/images/preview.png',
      provider: 'article',
      siteName: 'Example News',
    })
  })

  it('falls back to Twitter, standard metadata, and the document title', () => {
    const twitter = parse(`
      <head>
        <meta name="twitter:title" content="Twitter title">
        <meta name="twitter:description" content="Twitter description">
        <meta name="twitter:image" content="/twitter.png">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="application-name" content="Reader">
      </head>
    `)
    expect(twitter).toMatchObject({
      description: 'Twitter description',
      extractedTitle: 'Twitter title',
      imageUrl: 'https://example.com/twitter.png',
      provider: 'summary_large_image',
      siteName: 'Reader',
    })

    const standard = parse(`
      <head>
        <title>Document &amp; title</title>
        <meta name="description" content="Standard description">
      </head>
    `)
    expect(standard).toMatchObject({
      description: 'Standard description',
      extractedTitle: 'Document & title',
    })
  })

  it('ignores metadata outside the document head and markup hidden in scripts', () => {
    const metadata = parse(`
      <head>
        <title>Trusted head title</title>
        <script>
          <meta property="og:title" content="Script injection">
        </script>
      </head>
      <body>
        <meta property="og:title" content="Body injection">
        <link rel="canonical" href="https://attacker.example/">
      </body>
    `)

    expect(metadata.extractedTitle).toBe('Trusted head title')
    expect(metadata.canonicalUrl).toBeNull()
  })

  it('returns plain bounded text and removes control and bidi characters', () => {
    const overlongTitle = `${'a'.repeat(499)}😀tail`
    const metadata = parse(`
      <head>
        <meta property="og:title" content="${overlongTitle}">
        <meta property="og:description" content="before&#x0; after &#x202e;spoof">
      </head>
    `)

    expect(metadata.extractedTitle).toHaveLength(499)
    expect(metadata.extractedTitle).toBe('a'.repeat(499))
    expect(metadata.description).toBe('before after spoof')
  })

  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'https://user:secret@example.com/image.png',
    'http://localhost/image.png',
    'http://service.local/image.png',
    'http://10.0.0.1/image.png',
    'http://[::ffff:127.0.0.1]/image.png',
  ])('drops an unsafe metadata URL %s', (url) => {
    const metadata = parse(`
      <head>
        <link rel="canonical" href="${url}">
        <link rel="icon" href="${url}">
        <meta property="og:image" content="${url}">
      </head>
    `)

    expect(metadata.canonicalUrl).toBeNull()
    expect(metadata.faviconUrl).toBeNull()
    expect(metadata.imageUrl).toBeNull()
  })

  it('ignores an unsafe base URL and resolves against the fetched document', () => {
    const metadata = parse(`
      <head>
        <base href="http://127.0.0.1/private/">
        <link rel="canonical" href="canonical">
      </head>
    `)

    expect(metadata.canonicalUrl).toBe('https://example.com/articles/canonical')
  })

  it('tolerates malformed HTML and returns nulls when metadata is absent', () => {
    expect(parse('<html><head><title>Unclosed title')).toEqual({
      canonicalUrl: null,
      description: null,
      extractedTitle: 'Unclosed title',
      faviconUrl: null,
      imageUrl: null,
      provider: null,
      siteName: null,
    })
  })

  it.each(['file:///etc/passwd', 'http://127.0.0.1/private'])(
    'rejects unsafe document URL %s with a stable parser failure',
    (url) => {
      expect(() => parse('<title>Title</title>', url)).toThrow(
        MetadataParserError,
      )
    },
  )
})
