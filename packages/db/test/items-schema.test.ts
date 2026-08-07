import { describe, expect, it } from 'vitest'

import { getTableConfig } from 'drizzle-orm/pg-core'

import { items } from '../src/schema/index.js'

describe('Items database schema', () => {
  it('defines ownership, lifecycle, and optimistic-write constraints', () => {
    const configuration = getTableConfig(items)

    expect(configuration.foreignKeys).toHaveLength(1)
    expect(configuration.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        'items_content_required',
        'items_pin_requires_active_status',
        'items_trashed_at_matches_status',
        'items_version_positive',
      ]),
    )
  })

  it('starts both common indexes with the owner boundary', () => {
    const configuration = getTableConfig(items)
    const indexesByName = new Map(
      configuration.indexes.map((itemIndex) => [
        itemIndex.config.name,
        itemIndex,
      ]),
    )

    const listIndex = indexesByName.get('items_owner_status_created_id_idx')
    const duplicateIndex = indexesByName.get(
      'items_owner_active_normalized_url_idx',
    )
    const trashIndex = indexesByName.get('items_trashed_at_idx')

    expect(listIndex?.config.columns[0]).toMatchObject({ name: 'owner_id' })
    expect(duplicateIndex?.config.columns[0]).toMatchObject({
      name: 'owner_id',
    })
    expect(duplicateIndex?.config.where).toBeDefined()
    expect(trashIndex?.config.where).toBeDefined()
    expect(trashIndex?.config.columns[0]).toMatchObject({ name: 'trashed_at' })
  })
})
