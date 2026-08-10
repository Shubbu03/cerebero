import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createAuthClient } = vi.hoisted(() => ({
  createAuthClient: vi.fn(() => ({})),
}))

vi.mock('better-auth/react', () => ({ createAuthClient }))

describe('auth client', () => {
  beforeEach(() => {
    createAuthClient.mockClear()
    vi.resetModules()
  })

  it('does not refresh the session whenever the window regains focus', async () => {
    await import('../src/lib/auth-client')

    expect(createAuthClient).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionOptions: {
          refetchOnWindowFocus: false,
        },
      }),
    )
  })
})
