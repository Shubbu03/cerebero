import {
  extensionSessionSchema,
  publicUserSchema,
  type ExtensionSession,
} from '@cerebero/contracts'
import { z } from 'zod'

export const authenticationErrorCodeSchema = z.enum([
  'configuration',
  'network',
  'sign-in-cancelled',
  'unknown',
  'wrong-account',
])

export const authenticationStateSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('signed-out') }),
  z.strictObject({ status: z.literal('authenticating') }),
  z.strictObject({
    session: extensionSessionSchema,
    status: z.literal('signed-in'),
  }),
  z.strictObject({
    status: z.literal('expired-session'),
    user: publicUserSchema,
  }),
  z.strictObject({
    code: authenticationErrorCodeSchema,
    message: z.string().min(1),
    status: z.literal('recoverable-error'),
  }),
])

export type AuthenticationErrorCode = z.infer<
  typeof authenticationErrorCodeSchema
>
export type AuthenticationState = z.infer<typeof authenticationStateSchema>

export type AuthenticatedExtensionRecord = {
  session: ExtensionSession
  status: 'authenticated'
  token: string
}

export type ExpiredExtensionRecord = {
  session: ExtensionSession
  status: 'expired'
}

export type StoredExtensionAuthentication =
  AuthenticatedExtensionRecord | ExpiredExtensionRecord

export interface ExtensionAuthenticationStore {
  clear(): Promise<void>
  read(): Promise<StoredExtensionAuthentication | null>
  writeAuthenticated(record: AuthenticatedExtensionRecord): Promise<void>
  writeExpired(session: ExtensionSession): Promise<void>
}

export interface ExtensionIdentityProvider {
  forgetGoogleAccessToken(accessToken: string): Promise<void>
  getGoogleAccessToken(): Promise<string>
}

export interface ExtensionAuthenticationApi {
  exchangeGoogleAccessToken(
    accessToken: string,
  ): Promise<{ session: ExtensionSession; token: string }>
  logout(token: string): Promise<void>
}

export interface ExtensionAuthenticationController {
  getState(): Promise<AuthenticationState>
  signIn(): Promise<AuthenticationState>
  signOut(): Promise<AuthenticationState>
}
