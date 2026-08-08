import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { Suspense } from 'react'
import { z } from 'zod'

import {
  ForgotPasswordRoute,
  LoginRoute,
  ResetPasswordRoute,
  SignupRoute,
  VerifyEmailRoute,
} from '../features/auth/auth-routes'
import { LibraryRoute } from '../features/library/library-route'
import { authClient } from '../lib/auth-client'
import { LandingRoute } from '../routes/index'
import { AuthenticatedLayout } from './authenticated-layout'
import { LazyItemDetailFeatureEntry } from './lazy-item-detail'
import { NotFoundRoute } from './not-found-route'

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundRoute,
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

const libraryRoute = createRoute({
  component: LibraryRoute,
  getParentRoute: () => authenticatedRoute,
  path: '/library',
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
        <LazyItemDetailFeatureEntry itemId={itemId} />
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
  authenticatedRoute.addChildren([libraryRoute, itemDetailRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
