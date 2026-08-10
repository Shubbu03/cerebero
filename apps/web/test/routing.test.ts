import { beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../src/app/router'

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn().mockResolvedValue({
    data: {
      session: { id: 'session-1', userId: 'user-1' },
      user: { id: 'user-1' },
    },
  }),
}))

vi.mock('../src/lib/auth-client', () => ({
  authClient: { getSession },
}))

describe('public routing', () => {
  beforeEach(() => {
    getSession.mockClear()
  })

  it('does not expose login or signup pages', () => {
    const paths = Object.keys(router.routesByPath)

    expect(paths).not.toContain('/login')
    expect(paths).not.toContain('/signup')
    expect(paths).not.toContain('/search')
  })

  it('does not repeat a remote session check for authenticated child navigation', async () => {
    await router.navigate({ to: '/library' })
    await router.navigate({ to: '/archive' })
    await router.navigate({
      search: { kind: 'link' },
      to: '/library',
    })

    expect(getSession).toHaveBeenCalledTimes(0)
  })
})
