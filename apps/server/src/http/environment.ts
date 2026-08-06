import type { AuthenticatedSession } from '@cerebero/contracts'

export type AppEnvironment = {
  Variables: {
    authSession: AuthenticatedSession | null
    requestId: string
  }
}
