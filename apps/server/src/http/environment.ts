import type { RequestPrincipal } from './authentication.js'

export type AppEnvironment = {
  Variables: {
    authPrincipal: RequestPrincipal | null
    requestId: string
    serverTimings: string[]
  }
}
