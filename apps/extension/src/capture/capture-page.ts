import { MAX_ITEM_TITLE_LENGTH } from '@cerebero/contracts'

import { capturePageSchema, type CapturePage } from './capture-types'

type BrowserTabPage = {
  title?: string | undefined
  url?: string | undefined
}

export function capturePageFromTab(tab: BrowserTabPage): CapturePage | null {
  if (!tab.url) {
    return null
  }

  const parsed = capturePageSchema.safeParse({
    title: tab.title?.trim().slice(0, MAX_ITEM_TITLE_LENGTH) || null,
    url: tab.url,
  })
  return parsed.success ? parsed.data : null
}
