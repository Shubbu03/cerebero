import { lazy } from 'react'

export const LazyItemDetailFeatureEntry = lazy(async () => {
  const module = await import('../features/items/item-detail-feature-entry')
  return { default: module.ItemDetailFeatureEntry }
})
