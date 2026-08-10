import { describe, expect, it } from 'vitest'

import { getTableConfig } from 'drizzle-orm/pg-core'

import { items } from '../src/schema/index.js'

describe('Search database indexes', () => {
  it('defines a GIN document index and trigram-capable title/url indexes', () => {
    const configuration = getTableConfig(items)
    const indexNames = configuration.indexes.map(
      (tableIndex) => tableIndex.config.name,
    )

    expect(indexNames).toEqual(
      expect.arrayContaining([
        'items_search_document_gin_idx',
        'items_authored_title_trgm_idx',
        'items_normalized_url_trgm_idx',
      ]),
    )

    const documentIndex = configuration.indexes.find(
      (tableIndex) =>
        tableIndex.config.name === 'items_search_document_gin_idx',
    )
    expect(documentIndex).toBeDefined()
  })
})
