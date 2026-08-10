import { describe, expect, it } from 'vitest'

import { getTableConfig } from 'drizzle-orm/pg-core'

import {
  account,
  items,
  itemTags,
  session,
  shareLinks,
  tags,
} from '../src/schema/index.js'

describe('Account deletion database boundary', () => {
  it('cascades every user-owned record from the authenticated User row', () => {
    for (const table of [items, tags, itemTags, shareLinks, session, account]) {
      const configuration = getTableConfig(table)
      const userReference = configuration.foreignKeys.find((foreignKey) =>
        foreignKey
          .reference()
          .columns.some(
            (column) => column.name === 'owner_id' || column.name === 'user_id',
          ),
      )

      expect(userReference?.onDelete).toBe('cascade')
    }
  })
})
