import { storage } from 'wxt/utils/storage'

import {
  capturePageSchema,
  pendingCaptureSchema,
  type PendingCaptureStore,
} from './capture-types'

const pendingCaptureItem = storage.defineItem<unknown>(
  'local:cerebero-pending-capture',
  {
    fallback: null,
    version: 1,
  },
)

export const extensionPendingCaptureStore: PendingCaptureStore = {
  clear: () => pendingCaptureItem.removeValue(),

  read: async () => {
    const raw = await pendingCaptureItem.getValue()
    const parsed = pendingCaptureSchema.safeParse(raw)
    if (parsed.success) {
      return parsed.data
    }

    if (raw !== null) {
      await pendingCaptureItem.removeValue()
    }
    return null
  },

  write: async (rawPage) => {
    const page = capturePageSchema.parse(rawPage)
    const pending = pendingCaptureSchema.parse({
      ...page,
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID(),
    })
    await pendingCaptureItem.setValue(pending)
    return pending
  },
}
