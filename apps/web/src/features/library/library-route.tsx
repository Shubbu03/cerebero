import type { LibrarySearch } from './library-search-schema'
import { LibraryFeatureEntry } from './library-feature-entry'
import { toLibraryListFilters } from './to-library-list-filters'

type LibraryRouteProps = {
  search: LibrarySearch
}

export function LibraryRoute({ search }: LibraryRouteProps) {
  return <LibraryFeatureEntry filters={toLibraryListFilters(search)} />
}
