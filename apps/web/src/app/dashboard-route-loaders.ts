export const importAuthenticatedLayout = () => import('./authenticated-layout')
export const importLibraryRoute = () =>
  import('../features/library/library-route')
export const importCollections = () =>
  import('../features/collections/collection-feature-entry')
export const importSettings = () =>
  import('../features/settings/settings-feature-entry')

export async function preloadDashboardRoutes(): Promise<void> {
  await Promise.allSettled([
    importLibraryRoute(),
    importCollections(),
    importSettings(),
  ])
}
