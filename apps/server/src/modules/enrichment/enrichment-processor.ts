import {
  RestrictedHttpError,
  type RestrictedHttpClient,
} from '../../infrastructure/outbound-http/outbound-http-types.js'
import type {
  ClaimedEnrichmentJob,
  EnrichmentErrorCode,
  EnrichmentFailure,
  EnrichmentQueue,
} from './enrichment-types.js'
import { EnrichmentQueueError } from './enrichment-types.js'
import {
  MetadataParserError,
  metadataParser,
  type MetadataParser,
} from './metadata-parser.js'

export type EnrichmentProcessResult =
  | { outcome: 'completed' }
  | { outcome: 'lease_lost' }
  | {
      availableAt: Date
      errorCode: EnrichmentErrorCode
      outcome: 'rescheduled'
    }
  | { errorCode: EnrichmentErrorCode; outcome: 'terminal' }

export interface EnrichmentProcessor {
  process(claim: ClaimedEnrichmentJob): Promise<EnrichmentProcessResult>
}

export type EnrichmentProcessorOptions = Readonly<{
  httpClient: RestrictedHttpClient
  parser?: MetadataParser
  queue: EnrichmentQueue
}>

function isLeaseLost(error: unknown): boolean {
  return error instanceof EnrichmentQueueError && error.code === 'LEASE_LOST'
}

function classifyProcessingFailure(error: unknown): EnrichmentFailure | null {
  if (error instanceof RestrictedHttpError) {
    return { code: error.code, retryable: error.retryable }
  }

  if (error instanceof MetadataParserError) {
    return { code: error.code, retryable: error.retryable }
  }

  if (
    error instanceof EnrichmentQueueError &&
    error.code === 'INVALID_METADATA'
  ) {
    return { code: 'invalid_metadata', retryable: false }
  }

  return null
}

export function createEnrichmentProcessor(
  options: EnrichmentProcessorOptions,
): EnrichmentProcessor {
  const parser = options.parser ?? metadataParser

  async function recordFailure(
    claim: ClaimedEnrichmentJob,
    failure: EnrichmentFailure,
  ): Promise<EnrichmentProcessResult> {
    try {
      const result = await options.queue.fail(claim, failure)
      return result.outcome === 'rescheduled'
        ? {
            availableAt: result.availableAt,
            errorCode: failure.code,
            outcome: 'rescheduled',
          }
        : { errorCode: failure.code, outcome: 'terminal' }
    } catch (error) {
      if (isLeaseLost(error)) {
        return { outcome: 'lease_lost' }
      }

      throw error
    }
  }

  return {
    async process(claim) {
      let metadata
      try {
        const response = await options.httpClient.get(claim.originalUrl)
        metadata = parser.parse({
          body: response.body,
          contentType: response.contentType,
          documentUrl: response.finalUrl,
        })
      } catch (error) {
        const failure = classifyProcessingFailure(error)
        if (!failure) {
          throw error
        }

        return await recordFailure(claim, failure)
      }

      try {
        await options.queue.complete(claim, metadata)
        return { outcome: 'completed' }
      } catch (error) {
        if (isLeaseLost(error)) {
          return { outcome: 'lease_lost' }
        }

        const failure = classifyProcessingFailure(error)
        if (!failure) {
          throw error
        }

        return await recordFailure(claim, failure)
      }
    },
  }
}
