import { describe, expect, it, vi } from 'vitest'

import type { ExtensionAuthenticationController } from '../src/auth/auth-types'
import { handleAuthenticationMessage } from '../src/messaging/auth-messages'

describe('popup-to-background authentication messages', () => {
  it('routes only allowlisted, strictly shaped messages', async () => {
    const getState = vi.fn().mockResolvedValue({ status: 'signed-out' })
    const signIn = vi.fn().mockResolvedValue({ status: 'authenticating' })
    const signOut = vi.fn().mockResolvedValue({ status: 'signed-out' })
    const controller: ExtensionAuthenticationController = {
      getState,
      signIn,
      signOut,
    }

    await expect(
      handleAuthenticationMessage(
        { type: 'authentication:get-state' },
        controller,
      ),
    ).resolves.toEqual({ status: 'signed-out' })
    await expect(
      handleAuthenticationMessage(
        { type: 'authentication:sign-in' },
        controller,
      ),
    ).resolves.toEqual({ status: 'authenticating' })
    await expect(
      handleAuthenticationMessage(
        { type: 'authentication:sign-out' },
        controller,
      ),
    ).resolves.toEqual({ status: 'signed-out' })
    await expect(
      handleAuthenticationMessage(
        { token: 'attacker-token', type: 'authentication:sign-in' },
        controller,
      ),
    ).resolves.toBeUndefined()

    expect(getState).toHaveBeenCalledOnce()
    expect(signIn).toHaveBeenCalledOnce()
    expect(signOut).toHaveBeenCalledOnce()
  })
})
