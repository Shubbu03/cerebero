import { extensionSessionSchema } from '@cerebero/contracts'
import { storage } from 'wxt/utils/storage'
import { z } from 'zod'

import type {
  AuthenticatedExtensionRecord,
  ExtensionAuthenticationStore,
  StoredExtensionAuthentication,
} from './auth-types'

const storedAuthenticationSchema = z.discriminatedUnion('status', [
  z.strictObject({
    session: extensionSessionSchema,
    status: z.literal('authenticated'),
    token: z.string().min(32).max(256),
  }),
  z.strictObject({
    session: extensionSessionSchema,
    status: z.literal('expired'),
  }),
])

const authenticationItem = storage.defineItem<unknown>(
  'local:cerebero-authentication',
  {
    fallback: null,
    version: 1,
  },
)

export const extensionAuthenticationStore: ExtensionAuthenticationStore = {
  clear: () => authenticationItem.removeValue(),

  read: async () => {
    const raw = await authenticationItem.getValue()
    const parsed = storedAuthenticationSchema.safeParse(raw)
    if (parsed.success) {
      return parsed.data
    }

    if (raw !== null) {
      await authenticationItem.removeValue()
    }
    return null
  },

  writeAuthenticated: (record: AuthenticatedExtensionRecord) =>
    authenticationItem.setValue(
      storedAuthenticationSchema.parse(
        record,
      ) satisfies StoredExtensionAuthentication,
    ),

  writeExpired: (session) =>
    authenticationItem.setValue({
      session: extensionSessionSchema.parse(session),
      status: 'expired',
    } satisfies StoredExtensionAuthentication),
}
