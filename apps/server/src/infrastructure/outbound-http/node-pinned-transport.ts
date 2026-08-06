import http from 'node:http'
import https from 'node:https'
import type { LookupFunction, Socket } from 'node:net'

import {
  PinnedTransportError,
  type PinnedHttpTransport,
  type PinnedTransportRequest,
} from './outbound-http-types.js'

const MAX_RESPONSE_HEADER_BYTES = 16 * 1024

export function createPinnedLookup(
  address: PinnedTransportRequest['address'],
): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [address])
      return
    }

    callback(null, address.address, address.family)
  }
}

function installConnectionTimeout(
  request: http.ClientRequest,
  socket: Socket,
  input: PinnedTransportRequest,
): void {
  const connectedEvent =
    input.url.protocol === 'https:' ? 'secureConnect' : 'connect'
  const timeout = setTimeout(() => {
    request.destroy(new PinnedTransportError('TIMED_OUT'))
  }, input.connectionTimeoutMs)
  timeout.unref()

  const clearConnectionTimeout = (): void => {
    clearTimeout(timeout)
  }

  socket.once(connectedEvent, clearConnectionTimeout)
  socket.once('close', clearConnectionTimeout)
  socket.once('error', clearConnectionTimeout)
}

async function requestPinned(
  input: PinnedTransportRequest,
): Promise<Awaited<ReturnType<PinnedHttpTransport['request']>>> {
  return await new Promise((resolve, reject) => {
    const requestFunction =
      input.url.protocol === 'https:' ? https.request : http.request
    const request = requestFunction(
      input.url,
      {
        agent: false,
        headers: input.headers,
        lookup: createPinnedLookup(input.address),
        maxHeaderSize: MAX_RESPONSE_HEADER_BYTES,
        method: 'GET',
        signal: input.signal,
      },
      (response) => {
        response.setTimeout(input.responseInactivityTimeoutMs, () => {
          response.destroy(new PinnedTransportError('TIMED_OUT'))
        })

        resolve({
          body: response,
          destroy: (error?: Error) => response.destroy(error),
          headers: response.headers,
          statusCode: response.statusCode ?? 0,
        })
      },
    )

    request.once('socket', (socket) => {
      installConnectionTimeout(request, socket, input)
    })
    request.once('error', (error) => {
      if (error instanceof PinnedTransportError) {
        reject(error)
        return
      }

      reject(new PinnedTransportError('UNAVAILABLE'))
    })
    request.end()
  })
}

export const nodePinnedHttpTransport: PinnedHttpTransport = {
  request: requestPinned,
}
