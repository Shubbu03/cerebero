import { describe, expect, it, vi, type Mock } from 'vitest'

import { createPinnedLookup } from '../src/infrastructure/outbound-http/node-pinned-transport.js'
import {
  PinnedTransportError,
  RestrictedHttpError,
  type AddressResolver,
  type PinnedHttpTransport,
  type PinnedTransportRequest,
  type PinnedTransportResponse,
} from '../src/infrastructure/outbound-http/outbound-http-types.js'
import { createRestrictedHttpClient } from '../src/infrastructure/outbound-http/restricted-http-client.js'

const PUBLIC_IPV4 = '93.184.216.34'
const textEncoder = new TextEncoder()

type TestResponse = Omit<PinnedTransportResponse, 'destroy'> & {
  destroy: Mock<(error?: Error) => void>
}

function publicResolver(
  overrides: Readonly<
    Record<string, readonly { address: string; family: 4 | 6 }[]>
  > = {},
): AddressResolver {
  return (hostname) =>
    Promise.resolve(
      overrides[hostname] ?? [{ address: PUBLIC_IPV4, family: 4 }],
    )
}

function response(
  options: {
    body?: AsyncIterable<Uint8Array>
    chunks?: readonly (string | Uint8Array)[]
    headers?: PinnedTransportResponse['headers']
    statusCode?: number
  } = {},
): TestResponse {
  const chunks = options.chunks ?? ['<html></html>']
  const body =
    options.body ??
    (async function* () {
      await Promise.resolve()
      for (const chunk of chunks) {
        yield typeof chunk === 'string' ? textEncoder.encode(chunk) : chunk
      }
    })()

  return {
    body,
    destroy: vi.fn<(error?: Error) => void>(),
    headers: options.headers ?? { 'content-type': 'text/html; charset=utf-8' },
    statusCode: options.statusCode ?? 200,
  }
}

function fakeTransport(
  handle: (
    input: PinnedTransportRequest,
    requestIndex: number,
  ) => Promise<PinnedTransportResponse> | PinnedTransportResponse,
): PinnedHttpTransport & { requests: PinnedTransportRequest[] } {
  const requests: PinnedTransportRequest[] = []

  return {
    requests,
    async request(input) {
      requests.push(input)
      return await handle(input, requests.length - 1)
    },
  }
}

function expectRestrictedError(
  error: unknown,
  expected: { code: RestrictedHttpError['code']; retryable: boolean },
): void {
  expect(error).toBeInstanceOf(RestrictedHttpError)
  expect(error).toMatchObject(expected)
}

describe('Restricted outbound HTTP client', () => {
  it.each([
    'http://127.0.0.1/',
    'http://2130706433/',
    'http://0177.0.0.1/',
    'http://10.0.0.1/',
    'http://100.64.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://224.0.0.1/',
    'http://240.0.0.1/',
    'http://255.255.255.255/',
    'http://[::1]/',
    'http://[fe80::1]/',
    'http://[fd00:ec2::254]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[2001:db8::1]/',
    'http://[64:ff9b::808:808]/',
  ])('blocks non-public IP literal %s', async (url) => {
    const transport = fakeTransport(() => response())
    const client = createRestrictedHttpClient({
      resolver: publicResolver(),
      transport,
    })

    await client.get(url).then(
      () => {
        throw new Error('Expected the destination to be blocked.')
      },
      (error: unknown) => {
        expectRestrictedError(error, {
          code: 'blocked_unsafe_url',
          retryable: false,
        })
      },
    )
    expect(transport.requests).toHaveLength(0)
  })

  it('rejects credentials and non-HTTP protocols before resolution', async () => {
    const resolver = vi.fn<AddressResolver>(publicResolver())
    const transport = fakeTransport(() => response())
    const client = createRestrictedHttpClient({ resolver, transport })

    for (const url of [
      'https://user:secret@example.com/private',
      'ftp://example.com/file',
      'file:///etc/passwd',
    ]) {
      await expect(client.get(url)).rejects.toMatchObject({
        code: 'blocked_unsafe_url',
        retryable: false,
      })
    }

    expect(resolver).not.toHaveBeenCalled()
    expect(transport.requests).toHaveLength(0)
  })

  it('rejects a hostname when any resolved address is not public', async () => {
    const resolver = vi.fn<AddressResolver>(
      publicResolver({
        'mixed.example': [
          { address: PUBLIC_IPV4, family: 4 },
          { address: '127.0.0.1', family: 4 },
        ],
      }),
    )
    const transport = fakeTransport(() => response())
    const client = createRestrictedHttpClient({ resolver, transport })

    await expect(
      client.get('https://mixed.example/article'),
    ).rejects.toMatchObject({
      code: 'blocked_unsafe_url',
      retryable: false,
    })
    expect(transport.requests).toHaveLength(0)
  })

  it('pins a normalized public literal without consulting DNS', async () => {
    const resolver = vi.fn<AddressResolver>(publicResolver())
    const transport = fakeTransport(() => response())
    const client = createRestrictedHttpClient({ resolver, transport })

    await expect(
      client.get(`http://${PUBLIC_IPV4}/article`),
    ).resolves.toMatchObject({
      contentType: 'text/html',
      finalUrl: `http://${PUBLIC_IPV4}/article`,
      statusCode: 200,
    })
    expect(resolver).not.toHaveBeenCalled()
    expect(transport.requests[0]?.address).toEqual({
      address: PUBLIC_IPV4,
      family: 4,
    })
  })

  it('revalidates and repins each redirect destination', async () => {
    const resolver = vi.fn<AddressResolver>(
      publicResolver({
        'start.example': [{ address: PUBLIC_IPV4, family: 4 }],
        'www.example': [{ address: '142.250.72.132', family: 4 }],
      }),
    )
    const transport = fakeTransport((_input, requestIndex) =>
      requestIndex === 0
        ? response({
            headers: { location: 'https://www.example/final' },
            statusCode: 302,
          })
        : response({ chunks: ['<html>final</html>'] }),
    )
    const client = createRestrictedHttpClient({ resolver, transport })

    const result = await client.get('https://start.example/article')

    expect(result.finalUrl).toBe('https://www.example/final')
    expect(resolver.mock.calls).toEqual([['start.example'], ['www.example']])
    expect(transport.requests.map(({ address }) => address.address)).toEqual([
      PUBLIC_IPV4,
      '142.250.72.132',
    ])
  })

  it('blocks a redirect that resolves to a private address', async () => {
    const resolver = publicResolver({
      'internal.example': [{ address: '10.1.2.3', family: 4 }],
    })
    const firstResponse = response({
      headers: { location: 'http://internal.example/admin' },
      statusCode: 302,
    })
    const transport = fakeTransport(() => firstResponse)
    const client = createRestrictedHttpClient({ resolver, transport })

    await expect(
      client.get('https://public.example/article'),
    ).rejects.toMatchObject({
      code: 'blocked_unsafe_url',
      retryable: false,
    })
    expect(firstResponse.destroy).toHaveBeenCalledOnce()
    expect(transport.requests).toHaveLength(1)
  })

  it('caps redirect chains', async () => {
    const transport = fakeTransport((input) =>
      response({
        headers: { location: `${input.url.pathname}x` },
        statusCode: 302,
      }),
    )
    const client = createRestrictedHttpClient({
      maxRedirects: 1,
      resolver: publicResolver(),
      transport,
    })

    await expect(client.get('https://example.com/a')).rejects.toMatchObject({
      code: 'unavailable',
      retryable: false,
    })
    expect(transport.requests).toHaveLength(2)
  })

  it('sends only fixed metadata headers', async () => {
    const transport = fakeTransport(() => response())
    const client = createRestrictedHttpClient({
      resolver: publicResolver(),
      transport,
    })

    await client.get('https://example.com/article')

    expect(transport.requests[0]?.headers).toEqual({
      accept: 'text/html, application/xhtml+xml;q=0.9',
      'accept-encoding': 'identity',
      connection: 'close',
      'user-agent': 'Cerebero-Enrichment/1.0',
    })
    expect(transport.requests[0]?.headers).not.toHaveProperty('authorization')
    expect(transport.requests[0]?.headers).not.toHaveProperty('cookie')
  })

  it('accepts only HTML metadata documents and identity encoding', async () => {
    const htmlTransport = fakeTransport(() =>
      response({
        headers: { 'content-type': 'Application/XHTML+XML; charset=UTF-8' },
      }),
    )
    const htmlClient = createRestrictedHttpClient({
      resolver: publicResolver(),
      transport: htmlTransport,
    })

    await expect(
      htmlClient.get('https://example.com/article'),
    ).resolves.toMatchObject({ contentType: 'application/xhtml+xml' })

    for (const headers of [
      {},
      { 'content-type': 'application/json' },
      { 'content-encoding': 'gzip', 'content-type': 'text/html' },
    ]) {
      const transport = fakeTransport(() => response({ headers }))
      const client = createRestrictedHttpClient({
        resolver: publicResolver(),
        transport,
      })

      await expect(
        client.get('https://example.com/article'),
      ).rejects.toMatchObject({
        code: 'unsupported_content',
        retryable: false,
      })
    }
  })

  it('rejects oversized declared and streamed bodies', async () => {
    const declaredResponse = response({
      headers: {
        'content-length': '11',
        'content-type': 'text/html',
      },
    })
    const declaredClient = createRestrictedHttpClient({
      maxResponseBytes: 10,
      resolver: publicResolver(),
      transport: fakeTransport(() => declaredResponse),
    })

    await expect(
      declaredClient.get('https://example.com/article'),
    ).rejects.toMatchObject({
      code: 'response_too_large',
      retryable: false,
    })
    expect(declaredResponse.destroy).toHaveBeenCalledOnce()

    const streamedResponse = response({ chunks: ['123456', '78901'] })
    const streamedClient = createRestrictedHttpClient({
      maxResponseBytes: 10,
      resolver: publicResolver(),
      transport: fakeTransport(() => streamedResponse),
    })

    await expect(
      streamedClient.get('https://example.com/article'),
    ).rejects.toMatchObject({
      code: 'response_too_large',
      retryable: false,
    })
    expect(streamedResponse.destroy).toHaveBeenCalled()
  })

  it.each([
    [404, false],
    [408, true],
    [429, true],
    [503, true],
  ])(
    'maps status %i to a safe unavailable failure',
    async (statusCode, retryable) => {
      const transport = fakeTransport(() => response({ statusCode }))
      const client = createRestrictedHttpClient({
        resolver: publicResolver(),
        transport,
      })

      await client.get('https://example.com/article').then(
        () => {
          throw new Error('Expected the response to fail.')
        },
        (error: unknown) => {
          expectRestrictedError(error, { code: 'unavailable', retryable })
        },
      )
    },
  )

  it('enforces a total timeout across the operation', async () => {
    const transport = fakeTransport(
      (input) =>
        new Promise((_resolve, reject) => {
          input.signal.addEventListener(
            'abort',
            () => reject(new PinnedTransportError('TIMED_OUT')),
            { once: true },
          )
        }),
    )
    const client = createRestrictedHttpClient({
      resolver: publicResolver(),
      totalTimeoutMs: 10,
      transport,
    })

    await expect(client.get('https://example.com/slow')).rejects.toMatchObject({
      code: 'timed_out',
      retryable: true,
    })
  })

  it('maps transport connection and inactivity timeouts without leaking details', async () => {
    const transport = fakeTransport(() => {
      throw new PinnedTransportError('TIMED_OUT')
    })
    const client = createRestrictedHttpClient({
      resolver: publicResolver(),
      transport,
    })

    await expect(client.get('https://example.com/slow')).rejects.toMatchObject({
      code: 'timed_out',
      retryable: true,
    })
  })

  it('never exposes a sensitive destination through transport errors', async () => {
    const transport = fakeTransport(() => {
      throw new Error(
        'connection failed for https://example.com/?token=secret-value',
      )
    })
    const client = createRestrictedHttpClient({
      resolver: publicResolver(),
      transport,
    })

    const error = await client
      .get('https://example.com/?token=secret-value')
      .catch((caught: unknown) => caught)

    expectRestrictedError(error, { code: 'unavailable', retryable: true })
    expect(String(error)).not.toContain('secret-value')
    expect(String(error)).not.toContain('example.com')
  })
})

describe('Pinned Node lookup', () => {
  it('returns only the validated address regardless of the requested hostname', async () => {
    const lookup = createPinnedLookup({ address: PUBLIC_IPV4, family: 4 })

    const result = await new Promise<{ address: string; family?: number }>(
      (resolve, reject) => {
        lookup('rebound.example', {}, (error, address, family) => {
          if (error) {
            reject(error)
            return
          }

          if (typeof address !== 'string') {
            reject(new Error('Expected one pinned address.'))
            return
          }

          if (family === undefined) {
            reject(new Error('Expected an address family.'))
            return
          }

          resolve({ address, family })
        })
      },
    )

    expect(result).toEqual({ address: PUBLIC_IPV4, family: 4 })
  })
})
