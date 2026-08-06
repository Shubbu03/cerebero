import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { z } from 'zod'

import {
  ForgotPasswordRoute,
  LoginRoute,
  ResetPasswordRoute,
  SignupRoute,
  VerifyEmailRoute,
} from '../features/auth/auth-routes'
import { InboxRoute } from '../features/auth/inbox-route'
import { authClient } from '../lib/auth-client'
import { FoundationRoute } from '../routes/index'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <main className="bg-canvas text-primary grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-tertiary font-mono text-xs tracking-[0.18em] uppercase">
          Not found
        </p>
        <h1 className="font-display mt-3 text-4xl">Nothing is filed here.</h1>
      </div>
    </main>
  ),
})

const indexRoute = createRoute({
  component: FoundationRoute,
  getParentRoute: () => rootRoute,
  path: '/',
})

const loginRoute = createRoute({
  component: LoginRoute,
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: z.object({ reset: z.coerce.boolean().optional() }),
})

const signupRoute = createRoute({
  component: SignupRoute,
  getParentRoute: () => rootRoute,
  path: '/signup',
})

const forgotPasswordRoute = createRoute({
  component: ForgotPasswordRoute,
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
})

const resetPasswordRoute = createRoute({
  component: () => {
    const { token } = resetPasswordRoute.useSearch()
    return <ResetPasswordRoute token={token} />
  },
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  validateSearch: z.object({ token: z.string().min(1).optional() }),
})

const verifyEmailRoute = createRoute({
  component: () => {
    const { sent, verified } = verifyEmailRoute.useSearch()
    return <VerifyEmailRoute sent={sent} verified={verified} />
  },
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  validateSearch: z.object({
    sent: z.coerce.boolean().optional(),
    verified: z.coerce.boolean().optional(),
  }),
})

const inboxRoute = createRoute({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data) {
      // TanStack Router uses a redirect response as control flow.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/login' })
    }
  },
  component: InboxRoute,
  getParentRoute: () => rootRoute,
  path: '/inbox',
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  inboxRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
