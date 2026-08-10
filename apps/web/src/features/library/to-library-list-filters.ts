import type { LibraryListFilters } from './data-access/library-items-query-key'
import type { LibrarySearch } from './library-search-schema'

export function toLibraryListFilters(
  search: LibrarySearch,
): LibraryListFilters {
  return {
    kind: search.kind,
    pinned: undefined,
    sort: search.sort,
    tag: search.tag,
  }
}
