import { z } from 'zod'
import { browser } from 'wxt/browser'

import {
  authenticationStateSchema,
  type AuthenticationState,
  type ExtensionAuthenticationController,
} from '../auth/auth-types'

export const authenticationMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('authentication:get-state') }),
  z.strictObject({ type: z.literal('authentication:sign-in') }),
  z.strictObject({ type: z.literal('authentication:sign-out') }),
])

export type AuthenticationMessage = z.infer<typeof authenticationMessageSchema>

export async function handleAuthenticationMessage(
  rawMessage: unknown,
  controller: ExtensionAuthenticationController,
): Promise<AuthenticationState | undefined> {
  const parsed = authenticationMessageSchema.safeParse(rawMessage)
  if (!parsed.success) {
    return undefined
  }

  switch (parsed.data.type) {
    case 'authentication:get-state':
      return controller.getState()
    case 'authentication:sign-in':
      return controller.signIn()
    case 'authentication:sign-out':
      return controller.signOut()
  }
}

export async function sendAuthenticationMessage(
  message: AuthenticationMessage,
): Promise<AuthenticationState> {
  const response: unknown = await browser.runtime.sendMessage(message)
  return authenticationStateSchema.parse(response)
}
