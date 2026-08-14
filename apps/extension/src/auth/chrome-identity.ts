import { browser } from 'wxt/browser'

import type { ExtensionIdentityProvider } from './auth-types'
import {
  classifyGoogleIdentityError,
  GoogleIdentityError,
} from './google-identity-error'

const GOOGLE_EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email'

export const chromeIdentityProvider: ExtensionIdentityProvider = {
  forgetGoogleAccessToken: (accessToken) =>
    browser.identity.removeCachedAuthToken({ token: accessToken }),

  getGoogleAccessToken: async () => {
    try {
      const result = await browser.identity.getAuthToken({
        interactive: true,
        scopes: [GOOGLE_EMAIL_SCOPE],
      })
      if (!result.token) {
        throw new GoogleIdentityError(
          'cancelled',
          'Google sign-in was closed before it finished.',
        )
      }
      return result.token
    } catch (error) {
      if (error instanceof GoogleIdentityError) {
        throw error
      }
      throw classifyGoogleIdentityError(error)
    }
  },
}
