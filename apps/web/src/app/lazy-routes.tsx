import { lazy } from 'react'

import {
  importAuthenticatedLayout,
  importCollections,
  importLibraryRoute,
  importSettings,
} from './dashboard-route-loaders'

export const LazyAuthenticatedLayout = lazy(async () => {
  const module = await importAuthenticatedLayout()
  return { default: module.AuthenticatedLayout }
})

export const LazyLandingRoute = lazy(async () => {
  const module = await import('../routes/index')
  return { default: module.LandingRoute }
})

export const LazyPrivacyRoute = lazy(async () => {
  const module = await import('../routes/legal')
  return { default: module.PrivacyRoute }
})

export const LazyTermsRoute = lazy(async () => {
  const module = await import('../routes/legal')
  return { default: module.TermsRoute }
})

export const LazyPublicSharedFeatureEntry = lazy(async () => {
  const module = await import('../features/sharing/public-shared-feature-entry')
  return { default: module.PublicSharedFeatureEntry }
})

export const LazyLibraryRoute = lazy(async () => {
  const module = await importLibraryRoute()
  return { default: module.LibraryRoute }
})

export const LazyArchiveFeatureEntry = lazy(async () => {
  const module = await importCollections()
  return { default: module.ArchiveFeatureEntry }
})

export const LazyTrashFeatureEntry = lazy(async () => {
  const module = await importCollections()
  return { default: module.TrashFeatureEntry }
})

export const LazySettingsFeatureEntry = lazy(async () => {
  const module = await importSettings()
  return { default: module.SettingsFeatureEntry }
})

export const LazyItemDetailFeatureEntry = lazy(async () => {
  const module = await import('../features/items/item-detail-feature-entry')
  return { default: module.ItemDetailFeatureEntry }
})
