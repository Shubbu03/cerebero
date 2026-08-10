import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '../src/lib/api-client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('API client query serialization', () => {
  it('serializes array filters as repeated query parameters', async () => {
    const firstTagId = '00000000-0000-4000-8000-000000000101'
    const secondTagId = '00000000-0000-4000-8000-000000000102'
    const fetchRequest = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchRequest)

    await apiClient.get('/items', {
      params: { tag: [firstTagId, secondTagId] },
    })

    expect(fetchRequest).toHaveBeenCalledOnce()
    const requestInput = fetchRequest.mock.calls[0]?.[0]
    expect(typeof requestInput).toBe('string')
    if (typeof requestInput !== 'string') {
      throw new TypeError('Expected Xior to call fetch with a URL string.')
    }
    const requestedUrl = new URL(requestInput)
    expect(requestedUrl.searchParams.getAll('tag')).toEqual([
      firstTagId,
      secondTagId,
    ])
    expect([...requestedUrl.searchParams.keys()]).not.toContain('tag[0]')
    expect([...requestedUrl.searchParams.keys()]).not.toContain('tag[1]')
  })
})
