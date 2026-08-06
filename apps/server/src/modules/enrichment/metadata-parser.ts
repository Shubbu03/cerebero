import { Parser } from 'htmlparser2'
import ipaddr from 'ipaddr.js'

import type { EnrichmentMetadata } from './enrichment-types.js'
import type { RestrictedHttpResponse } from '../../infrastructure/outbound-http/outbound-http-types.js'

const MAX_METADATA_URL_LENGTH = 2_048
const MAX_RAW_URL_CANDIDATE_LENGTH = 8_192
const UNSAFE_TEXT_CONTROLS = /[\p{Cc}\u202A-\u202E\u2066-\u2069\uFFFD]/gu

const META_KEYS = [
  'application-name',
  'description',
  'og:description',
  'og:image',
  'og:image:secure_url',
  'og:image:url',
  'og:site_name',
  'og:title',
  'og:type',
  'twitter:card',
  'twitter:description',
  'twitter:image',
  'twitter:image:src',
  'twitter:title',
] as const

type MetaKey = (typeof META_KEYS)[number]

const META_KEY_SET = new Set<string>(META_KEYS)

export type MetadataParserInput = Readonly<{
  body: Uint8Array
  contentType: RestrictedHttpResponse['contentType']
  documentUrl: string
}>

export interface MetadataParser {
  parse(input: MetadataParserInput): EnrichmentMetadata
}

export class MetadataParserError extends Error {
  readonly code = 'invalid_metadata' as const
  readonly retryable = false

  constructor() {
    super('The destination metadata could not be processed.')
    this.name = 'MetadataParserError'
  }
}

type RawMetadata = {
  baseHref: string | null
  canonicalHref: string | null
  faviconHref: string | null
  meta: Partial<Record<MetaKey, string>>
  title: string
}

function normalizeText(
  value: string | undefined,
  maximumLength: number,
): string | null {
  if (!value) {
    return null
  }

  const normalized = value
    .replace(UNSAFE_TEXT_CONTROLS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (normalized.length === 0) {
    return null
  }

  const truncated = normalized.slice(0, maximumLength)
  const finalCodeUnit = truncated.charCodeAt(truncated.length - 1)
  return finalCodeUnit >= 0xd800 && finalCodeUnit <= 0xdbff
    ? truncated.slice(0, -1)
    : truncated
}

function isUnsafeHostnameLiteral(hostname: string): boolean {
  const candidate =
    hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname

  if (!ipaddr.isValid(candidate)) {
    return false
  }

  return ipaddr.parse(candidate).range() !== 'unicast'
}

function normalizeMetadataUrl(
  value: string | null,
  baseUrl: URL,
): string | null {
  if (!value || value.length > MAX_RAW_URL_CANDIDATE_LENGTH) {
    return null
  }

  let url: URL
  try {
    url = new URL(value, baseUrl)
  } catch {
    return null
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.hostname.length === 0 ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.localhost') ||
    url.hostname.endsWith('.local') ||
    isUnsafeHostnameLiteral(url.hostname)
  ) {
    return null
  }

  url.hash = ''
  const normalized = url.toString()
  return normalized.length <= MAX_METADATA_URL_LENGTH ? normalized : null
}

function parseDocumentUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new MetadataParserError()
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.hostname.length === 0 ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.localhost') ||
    url.hostname.endsWith('.local') ||
    isUnsafeHostnameLiteral(url.hostname)
  ) {
    throw new MetadataParserError()
  }

  return url
}

function extractRawMetadata(html: string): RawMetadata {
  const raw: RawMetadata = {
    baseHref: null,
    canonicalHref: null,
    faviconHref: null,
    meta: {},
    title: '',
  }
  let collectingMetadata = true
  let collectingTitle = false

  const parser = new Parser(
    {
      onclosetag(name) {
        if (name === 'title') {
          collectingTitle = false
        }
        if (name === 'head') {
          collectingMetadata = false
        }
      },
      onopentag(name, attributes) {
        if (name === 'body') {
          collectingMetadata = false
        }
        if (!collectingMetadata) {
          return
        }

        if (name === 'title') {
          collectingTitle = true
          return
        }

        if (name === 'base' && raw.baseHref === null && attributes.href) {
          raw.baseHref = attributes.href
          return
        }

        if (name === 'meta') {
          const key = (attributes.property ?? attributes.name)
            ?.trim()
            .toLowerCase()
          const content = attributes.content
          if (
            key &&
            content &&
            META_KEY_SET.has(key) &&
            raw.meta[key as MetaKey] === undefined
          ) {
            raw.meta[key as MetaKey] = content
          }
          return
        }

        if (name !== 'link' || !attributes.href || !attributes.rel) {
          return
        }

        const relations = new Set(
          attributes.rel.toLowerCase().split(/\s+/).filter(Boolean),
        )
        if (relations.has('canonical') && raw.canonicalHref === null) {
          raw.canonicalHref = attributes.href
        }
        if (
          raw.faviconHref === null &&
          [...relations].some((relation) =>
            ['apple-touch-icon', 'icon', 'mask-icon'].includes(relation),
          )
        ) {
          raw.faviconHref = attributes.href
        }
      },
      ontext(value) {
        if (collectingMetadata && collectingTitle) {
          raw.title += value
        }
      },
    },
    {
      decodeEntities: true,
      lowerCaseAttributeNames: true,
      lowerCaseTags: true,
      xmlMode: false,
    },
  )

  parser.end(html)
  return raw
}

function firstText(
  meta: RawMetadata['meta'],
  keys: readonly MetaKey[],
  fallback: string | undefined,
  maximumLength: number,
): string | null {
  for (const key of keys) {
    const value = normalizeText(meta[key], maximumLength)
    if (value) {
      return value
    }
  }

  return normalizeText(fallback, maximumLength)
}

function firstUrl(
  meta: RawMetadata['meta'],
  keys: readonly MetaKey[],
  baseUrl: URL,
): string | null {
  for (const key of keys) {
    const value = normalizeMetadataUrl(meta[key] ?? null, baseUrl)
    if (value) {
      return value
    }
  }

  return null
}

export const metadataParser: MetadataParser = {
  parse(input) {
    const documentUrl = parseDocumentUrl(input.documentUrl)

    try {
      const html = new TextDecoder('utf-8', { fatal: false }).decode(input.body)
      const raw = extractRawMetadata(html)
      const baseUrl =
        normalizeMetadataUrl(raw.baseHref, documentUrl) ??
        documentUrl.toString()
      const resolvedBaseUrl = new URL(baseUrl)

      return {
        canonicalUrl: normalizeMetadataUrl(raw.canonicalHref, resolvedBaseUrl),
        description: firstText(
          raw.meta,
          ['og:description', 'twitter:description', 'description'],
          undefined,
          2_000,
        ),
        extractedTitle: firstText(
          raw.meta,
          ['og:title', 'twitter:title'],
          raw.title,
          500,
        ),
        faviconUrl: normalizeMetadataUrl(raw.faviconHref, resolvedBaseUrl),
        imageUrl: firstUrl(
          raw.meta,
          [
            'og:image:secure_url',
            'og:image',
            'og:image:url',
            'twitter:image',
            'twitter:image:src',
          ],
          resolvedBaseUrl,
        ),
        provider: firstText(
          raw.meta,
          ['og:type', 'twitter:card'],
          undefined,
          100,
        ),
        siteName: firstText(
          raw.meta,
          ['og:site_name', 'application-name'],
          undefined,
          200,
        ),
      }
    } catch (error) {
      if (error instanceof MetadataParserError) {
        throw error
      }

      throw new MetadataParserError()
    }
  },
}
