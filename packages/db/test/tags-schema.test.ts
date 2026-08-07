import { describe, expect, it } from 'vitest'

import { getTableConfig } from 'drizzle-orm/pg-core'

import { itemTags, tags } from '../src/schema/index.js'

describe('Tags database schema', () => {
  it('scopes Tag uniqueness to the owner boundary', () => {
    const configuration = getTableConfig(tags)
    const indexNames = configuration.indexes.map(
      (tableIndex) => tableIndex.config.name,
    )

    expect(configuration.foreignKeys).toHaveLength(1)
    expect(configuration.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        'tags_name_nonempty',
        'tags_normalized_name_matches',
      ]),
    )
    expect(indexNames).toEqual(
      expect.arrayContaining([
        'tags_owner_normalized_name_unique',
        'tags_owner_created_id_idx',
      ]),
    )

    const uniqueIndex = configuration.indexes.find(
      (tableIndex) =>
        tableIndex.config.name === 'tags_owner_normalized_name_unique',
    )
    expect(uniqueIndex?.config.unique).toBe(true)
    expect(uniqueIndex?.config.columns[0]).toMatchObject({ name: 'owner_id' })
    expect(uniqueIndex?.config.columns[1]).toMatchObject({
      name: 'normalized_name',
    })
  })

  it('stores owner-scoped Item-Tag relationships with cascade deletes', () => {
    const configuration = getTableConfig(itemTags)
    const indexNames = configuration.indexes.map(
      (tableIndex) => tableIndex.config.name,
    )

    expect(configuration.primaryKeys).toHaveLength(1)
    expect(configuration.foreignKeys).toHaveLength(3)
    expect(indexNames).toEqual(
      expect.arrayContaining([
        'item_tags_owner_tag_item_idx',
        'item_tags_owner_item_tag_idx',
      ]),
    )

    const ownerLeadingIndexes = configuration.indexes.filter((tableIndex) =>
      tableIndex.config.name?.startsWith('item_tags_owner_'),
    )
    for (const tableIndex of ownerLeadingIndexes) {
      expect(tableIndex.config.columns[0]).toMatchObject({ name: 'owner_id' })
    }
  })
})
