import type { EnrichmentErrorCode } from '../../modules/enrichment/enrichment-types.js'

export type AddressFamily = 4 | 6

export type ResolvedAddress = Readonly<{
  address: string
  family: AddressFamily
}>

export type AddressResolver = (
  hostname: string,
) => Promise<readonly ResolvedAddress[]>

export type OutboundHttpErrorCode = Extract<
  EnrichmentErrorCode,
  | 'blocked_unsafe_url'
  | 'response_too_large'
  | 'timed_out'
  | 'unavailable'
  | 'unsupported_content'
>

const SAFE_ERROR_MESSAGES: Record<OutboundHttpErrorCode, string> = {
  blocked_unsafe_url: 'The destination is not permitted.',
  response_too_large: 'The response exceeded the permitted size.',
  timed_out: 'The destination did not respond in time.',
  unavailable: 'The destination is unavailable.',
  unsupported_content: 'The destination returned unsupported content.',
}

export class RestrictedHttpError extends Error {
  readonly code: OutboundHttpErrorCode
  readonly retryable: boolean

  constructor(code: OutboundHttpErrorCode, retryable: boolean) {
    super(SAFE_ERROR_MESSAGES[code])
    this.name = 'RestrictedHttpError'
    this.code = code
    this.retryable = retryable
  }
}

export class PinnedTransportError extends Error {
  readonly code: 'TIMED_OUT' | 'UNAVAILABLE'

  constructor(code: 'TIMED_OUT' | 'UNAVAILABLE') {
    super(code === 'TIMED_OUT' ? 'Transport timed out.' : 'Transport failed.')
    this.name = 'PinnedTransportError'
    this.code = code
  }
}

export type OutboundResponseHeaders = Readonly<
  Record<string, string | readonly string[] | undefined>
>

export type PinnedTransportRequest = Readonly<{
  address: ResolvedAddress
  connectionTimeoutMs: number
  headers: Readonly<Record<string, string>>
  responseInactivityTimeoutMs: number
  signal: AbortSignal
  url: URL
}>

export interface PinnedTransportResponse {
  readonly body: AsyncIterable<Uint8Array>
  readonly headers: OutboundResponseHeaders
  readonly statusCode: number
  readonly destroy: (error?: Error) => void
}

export interface PinnedHttpTransport {
  request(input: PinnedTransportRequest): Promise<PinnedTransportResponse>
}

export type RestrictedHttpResponse = Readonly<{
  body: Uint8Array
  contentType: 'application/xhtml+xml' | 'text/html'
  finalUrl: string
  statusCode: number
}>

export interface RestrictedHttpClient {
  get(url: string): Promise<RestrictedHttpResponse>
}
