import { browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'

import { createAuthenticationController } from '../src/auth/auth-controller'
import { extensionAuthenticationStore } from '../src/auth/auth-storage'
import { chromeIdentityProvider } from '../src/auth/chrome-identity'
import { captureActionFeedback } from '../src/capture/action-feedback'
import { createCaptureController } from '../src/capture/capture-controller'
import { capturePageFromTab } from '../src/capture/capture-page'
import { extensionPendingCaptureStore } from '../src/capture/capture-storage'
import type { CaptureAttemptResponse } from '../src/capture/capture-types'
import { extensionEnvironment } from '../src/config/environment'
import {
  createExtensionAuthenticationApi,
  createExtensionCaptureApi,
} from '../src/lib/extension-api'
import { handleAuthenticationMessage } from '../src/messaging/auth-messages'
import {
  activeTabCapturePageProvider,
  captureMessageSchema,
  handleCaptureMessage,
} from '../src/messaging/capture-messages'

const QUICK_CAPTURE_MENU_ID = 'cerebero-save-page'

const authenticationController = createAuthenticationController({
  api: createExtensionAuthenticationApi(extensionEnvironment.apiOrigin),
  configured: extensionEnvironment.googleAuthenticationConfigured,
  identity: chromeIdentityProvider,
  store: extensionAuthenticationStore,
})

const captureController = createCaptureController({
  api: createExtensionCaptureApi(extensionEnvironment.apiOrigin),
  authenticationStore: extensionAuthenticationStore,
  pendingStore: extensionPendingCaptureStore,
})

async function setActionFeedback(
  result: CaptureAttemptResponse,
  tabId?: number,
) {
  const feedback = captureActionFeedback(result)
  const details = tabId === undefined ? {} : { tabId }
  await Promise.all([
    browser.action.setBadgeBackgroundColor({
      color: feedback.badgeColor,
      ...details,
    }),
    browser.action.setBadgeText({ text: feedback.badgeText, ...details }),
    browser.action.setTitle({ title: feedback.title, ...details }),
  ])

  if (feedback.clearAfterMs !== null) {
    setTimeout(() => {
      void Promise.all([
        browser.action.setBadgeText({ text: '', ...details }),
        browser.action.setTitle({ title: 'Cerebero', ...details }),
      ])
    }, feedback.clearAfterMs)
  }
}

async function registerQuickCaptureMenu() {
  await browser.contextMenus.removeAll()
  browser.contextMenus.create({
    contexts: ['page'],
    documentUrlPatterns: ['http://*/*', 'https://*/*'],
    id: QUICK_CAPTURE_MENU_ID,
    title: 'Save to Cerebero',
  })
}

async function clearAcknowledgedActionFeedback() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  const details = tab?.id === undefined ? {} : { tabId: tab.id }
  await Promise.all([
    browser.action.setBadgeText({ text: '', ...details }),
    browser.action.setTitle({ title: 'Cerebero', ...details }),
  ])
}

export default defineBackground(() => {
  void browser.storage.local
    .setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
    .catch(() => undefined)

  browser.runtime.onInstalled.addListener(() => {
    void registerQuickCaptureMenu()
  })

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== QUICK_CAPTURE_MENU_ID) {
      return
    }

    const page = capturePageFromTab({
      title: tab?.title,
      url: info.pageUrl || tab?.url,
    })
    const operation = page
      ? captureController.captureQuick(page)
      : Promise.resolve({
          code: 'invalid-page',
          message: 'Chrome does not allow this page to be saved.',
          status: 'failed',
        } satisfies CaptureAttemptResponse)

    void operation.then(
      (result) => setActionFeedback(result, tab?.id),
      () =>
        setActionFeedback(
          {
            code: 'unknown',
            message: 'This page could not be saved. Try again.',
            status: 'failed',
          },
          tab?.id,
        ),
    )
  })

  browser.runtime.onMessage.addListener(
    (message: unknown, _sender, respond) => {
      void (async () => {
        const authenticationResponse = await handleAuthenticationMessage(
          message,
          authenticationController,
        )
        if (authenticationResponse !== undefined) {
          return authenticationResponse
        }

        const captureResponse = await handleCaptureMessage(
          message,
          captureController,
          activeTabCapturePageProvider,
        )
        const captureMessage = captureMessageSchema.safeParse(message)
        if (
          captureMessage.success &&
          captureMessage.data.type === 'capture:get-draft'
        ) {
          void clearAcknowledgedActionFeedback()
        }
        return captureResponse
      })().then(respond, () => respond(undefined))
      return true
    },
  )
})
