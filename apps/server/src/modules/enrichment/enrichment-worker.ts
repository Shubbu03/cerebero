import type { AppLogger } from '../../infrastructure/logging/logger.js'
import type { TrashCleanupModule } from '../cleanup/cleanup-types.js'
import type {
  ClaimedEnrichmentJob,
  EnrichmentQueue,
  ReconciliationResult,
} from './enrichment-types.js'
import type {
  EnrichmentProcessResult,
  EnrichmentProcessor,
} from './enrichment-processor.js'

const DEFAULT_CONCURRENCY = 4
const DEFAULT_IDLE_POLL_INTERVAL_MS = 1_000
const DEFAULT_RECONCILIATION_BATCH_SIZE = 100
const DEFAULT_RECONCILIATION_INTERVAL_MS = 60_000
const DEFAULT_TRASH_CLEANUP_BATCH_SIZE = 100
const DEFAULT_TRASH_CLEANUP_INTERVAL_MS = 300_000
const MAX_CONCURRENCY = 32
const MAX_RECONCILIATION_BATCH_SIZE = 500
const MAX_TRASH_CLEANUP_BATCH_SIZE = 500

type Sleep = (milliseconds: number, signal: AbortSignal) => Promise<void>

export type EnrichmentWorkerOptions = Readonly<{
  clock?: () => number
  concurrency?: number
  idlePollIntervalMs?: number
  logger: AppLogger
  processor: EnrichmentProcessor
  queue: EnrichmentQueue
  reconciliationBatchSize?: number
  reconciliationIntervalMs?: number
  sleep?: Sleep
  trashCleanup?: TrashCleanupModule
  trashCleanupBatchSize?: number
  trashCleanupIntervalMs?: number
}>

export interface EnrichmentWorker {
  processAvailableBatch(signal?: AbortSignal): Promise<number>
  run(signal: AbortSignal): Promise<void>
}

function requireIntegerBetween(
  value: number,
  name: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`)
  }

  return value
}

function requirePositiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`)
  }

  return value
}

function defaultSleep(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(finish, milliseconds)

    function finish(): void {
      clearTimeout(timeout)
      signal.removeEventListener('abort', finish)
      resolve()
    }

    signal.addEventListener('abort', finish, { once: true })
  })
}

function logProcessResult(
  logger: AppLogger,
  claim: ClaimedEnrichmentJob,
  result: EnrichmentProcessResult,
): void {
  const context = {
    attemptCount: claim.attemptCount,
    jobId: claim.jobId,
  }

  switch (result.outcome) {
    case 'completed':
      logger.info('enrichment.job.completed', context)
      return
    case 'lease_lost':
      logger.warn('enrichment.job.lease_lost', context)
      return
    case 'rescheduled':
      logger.warn('enrichment.job.rescheduled', {
        ...context,
        errorCode: result.errorCode,
      })
      return
    case 'terminal':
      logger.warn('enrichment.job.terminal', {
        ...context,
        errorCode: result.errorCode,
      })
      return
    default: {
      const unreachable: never = result
      throw new Error(`Unhandled enrichment outcome: ${String(unreachable)}`)
    }
  }
}

export function createEnrichmentWorker(
  options: EnrichmentWorkerOptions,
): EnrichmentWorker {
  const clock = options.clock ?? Date.now
  const concurrency = requireIntegerBetween(
    options.concurrency ?? DEFAULT_CONCURRENCY,
    'concurrency',
    1,
    MAX_CONCURRENCY,
  )
  const idlePollIntervalMs = requirePositiveInteger(
    options.idlePollIntervalMs ?? DEFAULT_IDLE_POLL_INTERVAL_MS,
    'idlePollIntervalMs',
  )
  const reconciliationBatchSize = requireIntegerBetween(
    options.reconciliationBatchSize ?? DEFAULT_RECONCILIATION_BATCH_SIZE,
    'reconciliationBatchSize',
    1,
    MAX_RECONCILIATION_BATCH_SIZE,
  )
  const reconciliationIntervalMs = requirePositiveInteger(
    options.reconciliationIntervalMs ?? DEFAULT_RECONCILIATION_INTERVAL_MS,
    'reconciliationIntervalMs',
  )
  const trashCleanupBatchSize = requireIntegerBetween(
    options.trashCleanupBatchSize ?? DEFAULT_TRASH_CLEANUP_BATCH_SIZE,
    'trashCleanupBatchSize',
    1,
    MAX_TRASH_CLEANUP_BATCH_SIZE,
  )
  const trashCleanupIntervalMs = requirePositiveInteger(
    options.trashCleanupIntervalMs ?? DEFAULT_TRASH_CLEANUP_INTERVAL_MS,
    'trashCleanupIntervalMs',
  )
  const sleep = options.sleep ?? defaultSleep
  let isRunning = false

  async function processClaim(claim: ClaimedEnrichmentJob): Promise<void> {
    try {
      const result = await options.processor.process(claim)
      logProcessResult(options.logger, claim, result)
    } catch {
      options.logger.error('enrichment.job.processing_failed', {
        attemptCount: claim.attemptCount,
        jobId: claim.jobId,
      })
    }
  }

  async function processAvailableBatch(signal?: AbortSignal): Promise<number> {
    const claims: ClaimedEnrichmentJob[] = []

    for (let index = 0; index < concurrency; index += 1) {
      if (signal?.aborted) {
        break
      }

      try {
        const claim = await options.queue.claimNext()
        if (!claim) {
          break
        }
        claims.push(claim)
      } catch {
        options.logger.error('enrichment.worker.claim_failed')
        break
      }
    }

    await Promise.all(claims.map(processClaim))
    return claims.length
  }

  async function reconcile(): Promise<ReconciliationResult | null> {
    try {
      const result = await options.queue.reconcileStale(reconciliationBatchSize)
      options.logger.info('enrichment.worker.reconciled', result)
      return result
    } catch {
      options.logger.error('enrichment.worker.reconciliation_failed')
      return null
    }
  }

  async function purgeExpiredTrash(): Promise<void> {
    if (!options.trashCleanup) {
      return
    }

    try {
      const result = await options.trashCleanup.purgeExpiredTrash(
        trashCleanupBatchSize,
      )
      if (result.deletedCount > 0) {
        options.logger.info('cleanup.trash.purged', result)
      }
    } catch {
      options.logger.error('cleanup.trash.failed')
    }
  }

  return {
    processAvailableBatch,
    async run(signal) {
      if (isRunning) {
        throw new Error('The enrichment worker is already running.')
      }

      isRunning = true
      let nextReconciliationAt = 0
      let nextTrashCleanupAt = 0
      options.logger.info('enrichment.worker.started', { concurrency })

      try {
        while (!signal.aborted) {
          const now = clock()
          if (now >= nextReconciliationAt) {
            await reconcile()
            nextReconciliationAt = clock() + reconciliationIntervalMs
          }
          if (now >= nextTrashCleanupAt) {
            await purgeExpiredTrash()
            nextTrashCleanupAt = clock() + trashCleanupIntervalMs
          }

          const claimed = await processAvailableBatch(signal)
          if (claimed === 0 && !signal.aborted) {
            await sleep(idlePollIntervalMs, signal)
          }
        }
      } finally {
        isRunning = false
        options.logger.info('enrichment.worker.stopped')
      }
    },
  }
}
