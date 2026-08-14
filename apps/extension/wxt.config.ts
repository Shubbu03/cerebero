import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

const DEVELOPMENT_API_ORIGIN = 'http://localhost:3000'
const UNCONFIGURED_GOOGLE_CLIENT_ID =
  'extension-oauth-client-not-configured.apps.googleusercontent.com'
const EXTENSION_DESCRIPTION =
  'Save the current page to your private Cerebero Library from the popup or right-click menu.'
const EXTENSION_ICONS = {
  16: 'icon/16.png',
  32: 'icon/32.png',
  48: 'icon/48.png',
  128: 'icon/128.png',
} as const

function apiHostPermission(value: string | undefined): string {
  const origin = new URL(value || DEVELOPMENT_API_ORIGIN).origin
  return `${origin}/*`
}

export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  targetBrowsers: ['chrome'],
  manifest: () => ({
    action: {
      default_icon: EXTENSION_ICONS,
      default_title: 'Cerebero',
    },
    description: EXTENSION_DESCRIPTION,
    homepage_url: 'https://cerebero.shubbu.dev/',
    host_permissions: [apiHostPermission(import.meta.env.WXT_API_ORIGIN)],
    icons: EXTENSION_ICONS,
    ...(import.meta.env.WXT_EXTENSION_PUBLIC_KEY
      ? { key: import.meta.env.WXT_EXTENSION_PUBLIC_KEY }
      : {}),
    name: 'Cerebero',
    oauth2: {
      client_id:
        import.meta.env.WXT_GOOGLE_CLIENT_ID || UNCONFIGURED_GOOGLE_CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/userinfo.email'],
    },
    permissions: ['activeTab', 'contextMenus', 'identity', 'storage'],
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  zip: {
    name: 'cerebero',
  },
})
