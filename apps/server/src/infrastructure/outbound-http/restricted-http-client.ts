import { nodePinnedHttpTransport } from './node-pinned-transport.js'
import {
  PinnedTransportError,
  RestrictedHttpError,
  type AddressResolver,
  type OutboundResponseHeaders,
  type PinnedHttpTransport,
  type PinnedTransportResponse,
  type RestrictedHttpClient,
  type RestrictedHttpResponse,
} from './outbound-http-types.js'
import {
  resolvePublicAddresses,
  systemAddressResolver,
} from './address-policy.js'

const DEFAULT_CONNECTION_TIMEOUT_MS = 3_000
const DEFAULT_MAX_REDIRECTS = 5
const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024
const DEFAULT_RESPONSE_INACTIVITY_TIMEOUT_MS = 5_000
const DEFAULT_TOTAL_TIMEOUT_MS = 10_000
const MAX_URL_LENGTH = 2_048

const FIXED_REQUEST_HEADERS = Object.freeze({
  accept: 'text/html, application/xhtml+xml;q=0.9',
  'accept-encoding': 'identity',
  connection: 'close',
  'user-agent': 'Cerebero-Enrichment/1.0',
})

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308])
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429])
const ALLOWED_CONTENT_TYPES = new Set<RestrictedHttpResponse['contentType']>([
  'application/xhtml+xml',
  'text/html',
])

export type RestrictedHttpClientOptions = Readonly<{
  connectionTimeoutMs?: number
  maxRedirects?: number
  maxResponseBytes?: number
  resolver?: AddressResolver
  responseInactivityTimeoutMs?: number
  totalTimeoutMs?: number
  transport?: PinnedHttpTransport
}>

type RequiredClientOptions = Readonly<{
  connectionTimeoutMs: number
  maxRedirects: number
  maxResponseBytes: number
  resolver: AddressResolver
  responseInactivityTimeoutMs: number
  totalTimeoutMs: number
  transport: PinnedHttpTransport
}>

function requirePositiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`)
  }

  return value
}

function requireNonNegativeInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`)
  }

  return value
}

function normalizeOptions(
  options: RestrictedHttpClientOptions,
): RequiredClientOptions {
  return {
    connectionTimeoutMs: requirePositiveInteger(
      options.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS,
      'connectionTimeoutMs',
    ),
    maxRedirects: requireNonNegativeInteger(
      options.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
      'maxRedirects',
    ),
    maxResponseBytes: requirePositiveInteger(
      options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
      'maxResponseBytes',
    ),
    resolver: options.resolver ?? systemAddressResolver,
    responseInactivityTimeoutMs: requirePositiveInteger(
      options.responseInactivityTimeoutMs ??
        DEFAULT_RESPONSE_INACTIVITY_TIMEOUT_MS,
      'responseInactivityTimeoutMs',
    ),
    totalTimeoutMs: requirePositiveInteger(
      options.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS,
      'totalTimeoutMs',
    ),
    transport: options.transport ?? nodePinnedHttpTransport,
  }
}

function parseDestination(input: string): URL {
  if (input.length === 0 || input.length > MAX_URL_LENGTH) {
    throw new RestrictedHttpError('blocked_unsafe_url', false)
  }

  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new RestrictedHttpError('blocked_unsafe_url', false)
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.hostname.length === 0 ||
    url.username.length > 0 ||
    url.password.length > 0
  ) {
    throw new RestrictedHttpError('blocked_unsafe_url', false)
  }

  return url
}

function getSingleHeader(
  headers: OutboundResponseHeaders,
  name: string,
): string | undefined {
  const value = headers[name]
  if (typeof value === 'string' || value === undefined) {
    return value
  }

  return value.length === 1 ? value[0] : undefined
}

function getContentType(
  response: PinnedTransportResponse,
): RestrictedHttpResponse['contentType'] {
  const contentEncoding = getSingleHeader(response.headers, 'content-encoding')
  if (contentEncoding && contentEncoding.trim().toLowerCase() !== 'identity') {
    throw new RestrictedHttpError('unsupported_content', false)
  }

  const header = getSingleHeader(response.headers, 'content-type')
  const mediaType = header?.split(';', 1)[0]?.trim().toLowerCase()
  if (
    !mediaType ||
    !ALLOWED_CONTENT_TYPES.has(
      mediaType as RestrictedHttpResponse['contentType'],
    )
  ) {
    throw new RestrictedHttpError('unsupported_content', false)
  }

  return mediaType as RestrictedHttpResponse['contentType']
}

function assertContentLengthWithinLimit(
  response: PinnedTransportResponse,
  maxResponseBytes: number,
): void {
  const header = getSingleHeader(response.headers, 'content-length')
  if (header === undefined) {
    return
  }

  if (!/^\d+$/.test(header.trim())) {
    throw new RestrictedHttpError('unavailable', false)
  }

  const length = Number(header)
  if (!Number.isSafeInteger(length)) {
    throw new RestrictedHttpError('response_too_large', false)
  }

  if (length > maxResponseBytes) {
    throw new RestrictedHttpError('response_too_large', false)
  }
}

async function readBoundedBody(
  response: PinnedTransportResponse,
  maxResponseBytes: number,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  for await (const chunk of response.body) {
    totalBytes += chunk.byteLength
    if (totalBytes > maxResponseBytes) {
      response.destroy()
      throw new RestrictedHttpError('response_too_large', false)
    }

    chunks.push(chunk)
  }

  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  return body
}

function mapTransportError(error: unknown, signal: AbortSignal): never {
  if (error instanceof RestrictedHttpError) {
    throw error
  }

  if (
    signal.aborted ||
    (error instanceof PinnedTransportError && error.code === 'TIMED_OUT')
  ) {
    throw new RestrictedHttpError('timed_out', true)
  }

  throw new RestrictedHttpError('unavailable', true)
}

async function executeRequest(
  initialUrl: URL,
  options: RequiredClientOptions,
  signal: AbortSignal,
): Promise<RestrictedHttpResponse> {
  let currentUrl = initialUrl
  let redirectsFollowed = 0

  while (true) {
    try {
      const addresses = await resolvePublicAddresses(
        currentUrl,
        options.resolver,
      )
      const address = addresses[0]
      if (!address) {
        throw new RestrictedHttpError('unavailable', true)
      }

      const response = await options.transport.request({
        address,
        connectionTimeoutMs: options.connectionTimeoutMs,
        headers: FIXED_REQUEST_HEADERS,
        responseInactivityTimeoutMs: options.responseInactivityTimeoutMs,
        signal,
        url: currentUrl,
      })

      if (REDIRECT_STATUS_CODES.has(response.statusCode)) {
        response.destroy()
        const location = getSingleHeader(response.headers, 'location')
        if (!location || redirectsFollowed >= options.maxRedirects) {
          throw new RestrictedHttpError('unavailable', false)
        }

        let destination: URL
        try {
          destination = new URL(location, currentUrl)
        } catch {
          throw new RestrictedHttpError('unavailable', false)
        }

        currentUrl = parseDestination(destination.toString())
        redirectsFollowed += 1
        continue
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.destroy()
        const retryable =
          RETRYABLE_STATUS_CODES.has(response.statusCode) ||
          response.statusCode >= 500
        throw new RestrictedHttpError('unavailable', retryable)
      }

      try {
        const contentType = getContentType(response)
        assertContentLengthWithinLimit(response, options.maxResponseBytes)
        const body = await readBoundedBody(response, options.maxResponseBytes)

        return {
          body,
          contentType,
          finalUrl: currentUrl.toString(),
          statusCode: response.statusCode,
        }
      } catch (error) {
        response.destroy()
        throw error
      }
    } catch (error) {
      mapTransportError(error, signal)
    }
  }
}

export function createRestrictedHttpClient(
  clientOptions: RestrictedHttpClientOptions = {},
): RestrictedHttpClient {
  const options = normalizeOptions(clientOptions)

  return {
    async get(input) {
      const initialUrl = parseDestination(input)
      const controller = new AbortController()
      const timeoutError = new RestrictedHttpError('timed_out', true)
      let timeout: ReturnType<typeof setTimeout> | undefined

      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          controller.abort()
          reject(timeoutError)
        }, options.totalTimeoutMs)
        timeout.unref()
      })

      try {
        return await Promise.race([
          executeRequest(initialUrl, options, controller.signal),
          timeoutPromise,
        ])
      } finally {
        if (timeout) {
          clearTimeout(timeout)
        }
        controller.abort()
      }
    },
  }
}
