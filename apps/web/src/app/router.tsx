import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import { librarySearchSchema } from '../features/library/library-search-schema'
import {
  LazyArchiveFeatureEntry,
  LazyAuthenticatedLayout,
  LazyItemDetailFeatureEntry,
  LazyLandingRoute,
  LazyLibraryRoute,
  LazyPrivacyRoute,
  LazyPublicSharedFeatureEntry,
  LazySettingsFeatureEntry,
  LazyTermsRoute,
  LazyTrashFeatureEntry,
} from './lazy-routes'
import { NotFoundRoute } from './not-found-route'
import { FeatureSuspense, RouteSuspense } from './route-loading'

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundRoute,
})

const indexRoute = createRoute({
  component: () => (
    <RouteSuspense label="Opening Cerebero…">
      <LazyLandingRoute />
    </RouteSuspense>
  ),
  getParentRoute: () => rootRoute,
  path: '/',
})

const privacyRoute = createRoute({
  component: () => (
    <RouteSuspense label="Opening privacy…">
      <LazyPrivacyRoute />
    </RouteSuspense>
  ),
  getParentRoute: () => rootRoute,
  path: '/privacy',
})

const termsRoute = createRoute({
  component: () => (
    <RouteSuspense label="Opening terms…">
      <LazyTermsRoute />
    </RouteSuspense>
  ),
  getParentRoute: () => rootRoute,
  path: '/terms',
})

const sharedRoute = createRoute({
  component: function SharedRouteComponent() {
    const { token } = sharedRoute.useParams()
    return (
      <RouteSuspense label="Opening shared Item…">
        <LazyPublicSharedFeatureEntry token={token} />
      </RouteSuspense>
    )
  },
  getParentRoute: () => rootRoute,
  path: '/shared/$token',
})

const authenticatedRoute = createRoute({
  component: () => (
    <RouteSuspense label="Opening your Library…">
      <LazyAuthenticatedLayout />
    </RouteSuspense>
  ),
  getParentRoute: () => rootRoute,
  id: 'authenticated',
})

const libraryRoute = createRoute({
  component: function LibraryRouteComponent() {
    return (
      <FeatureSuspense label="Opening Library…">
        <LazyLibraryRoute search={libraryRoute.useSearch()} />
      </FeatureSuspense>
    )
  },
  getParentRoute: () => authenticatedRoute,
  path: '/library',
  validateSearch: librarySearchSchema,
})

const archiveRoute = createRoute({
  component: () => (
    <FeatureSuspense label="Opening Archive…">
      <LazyArchiveFeatureEntry />
    </FeatureSuspense>
  ),
  getParentRoute: () => authenticatedRoute,
  path: '/archive',
})

const trashRoute = createRoute({
  component: () => (
    <FeatureSuspense label="Opening Trash…">
      <LazyTrashFeatureEntry />
    </FeatureSuspense>
  ),
  getParentRoute: () => authenticatedRoute,
  path: '/trash',
})

const settingsRoute = createRoute({
  component: () => (
    <FeatureSuspense label="Opening settings…">
      <LazySettingsFeatureEntry />
    </FeatureSuspense>
  ),
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
})

const itemDetailRoute = createRoute({
  component: () => {
    const { itemId } = itemDetailRoute.useParams()
    return (
      <FeatureSuspense label="Opening Item…">
        <LazyItemDetailFeatureEntry itemId={itemId} />
      </FeatureSuspense>
    )
  },
  getParentRoute: () => authenticatedRoute,
  path: '/items/$itemId',
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  privacyRoute,
  termsRoute,
  sharedRoute,
  authenticatedRoute.addChildren([
    libraryRoute,
    archiveRoute,
    trashRoute,
    settingsRoute,
    itemDetailRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
