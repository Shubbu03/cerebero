import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { z } from 'zod'

import {
  ForgotPasswordRoute,
  LoginRoute,
  ResetPasswordRoute,
  SignupRoute,
  VerifyEmailRoute,
} from '../features/auth/auth-routes'
import { InboxRoute } from '../features/inbox/inbox-route'
import { authClient } from '../lib/auth-client'
import { LandingRoute } from '../routes/index'
import { AuthenticatedLayout } from './authenticated-layout'

const ItemDetailFeatureEntry = lazy(async () => {
  const module = await import('../features/items/item-detail-feature-entry')
  return { default: module.ItemDetailFeatureEntry }
})

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
  component: LandingRoute,
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

const authenticatedRoute = createRoute({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data) {
      // TanStack Router uses a redirect response as control flow.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
  getParentRoute: () => rootRoute,
  id: 'authenticated',
})

const inboxRoute = createRoute({
  component: InboxRoute,
  getParentRoute: () => authenticatedRoute,
  path: '/inbox',
})

const itemDetailRoute = createRoute({
  component: () => {
    const { itemId } = itemDetailRoute.useParams()
    return (
      <Suspense
        fallback={
          <div
            className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-10"
            aria-busy="true"
          >
            <p className="text-secondary text-sm">Opening Item…</p>
          </div>
        }
      >
        <ItemDetailFeatureEntry itemId={itemId} />
      </Suspense>
    )
  },
  getParentRoute: () => authenticatedRoute,
  path: '/items/$itemId',
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  authenticatedRoute.addChildren([inboxRoute, itemDetailRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
