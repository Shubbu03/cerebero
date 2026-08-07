import { describe, expect, it } from 'vitest'

import { getTableConfig } from 'drizzle-orm/pg-core'

import { shareLinks } from '../src/schema/index.js'

describe('Share Links database schema', () => {
  it('stores hashed tokens with one-active-per-item uniqueness', () => {
    const configuration = getTableConfig(shareLinks)
    const indexNames = configuration.indexes.map(
      (tableIndex) => tableIndex.config.name,
    )

    expect(configuration.foreignKeys).toHaveLength(2)
    expect(indexNames).toEqual(
      expect.arrayContaining([
        'share_links_item_id_active_unique',
        'share_links_token_hash_unique',
        'share_links_owner_item_idx',
      ]),
    )

    const activeUnique = configuration.indexes.find(
      (tableIndex) =>
        tableIndex.config.name === 'share_links_item_id_active_unique',
    )
    expect(activeUnique?.config.unique).toBe(true)
    expect(activeUnique?.config.where).toBeDefined()

    const tokenUnique = configuration.indexes.find(
      (tableIndex) =>
        tableIndex.config.name === 'share_links_token_hash_unique',
    )
    expect(tokenUnique?.config.unique).toBe(true)
  })
})
