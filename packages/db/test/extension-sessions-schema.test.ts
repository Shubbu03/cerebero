import { describe, expect, it } from 'vitest'

import { getTableConfig } from 'drizzle-orm/pg-core'

import { extensionSessions } from '../src/schema/index.js'

describe('Extension sessions database schema', () => {
  it('stores only hashed, expiring, revocable, owner-scoped credentials', () => {
    const configuration = getTableConfig(extensionSessions)

    expect(configuration.foreignKeys).toHaveLength(1)
    expect(configuration.foreignKeys[0]?.onDelete).toBe('cascade')
    expect(configuration.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        'extension_sessions_token_hash_length',
        'extension_sessions_scope_required',
      ]),
    )
    expect(configuration.columns.map((column) => column.name)).not.toContain(
      'token',
    )
  })

  it('indexes token lookup, ownership, and active expiry cleanup', () => {
    const configuration = getTableConfig(extensionSessions)
    const indexes = new Map(
      configuration.indexes.map((entry) => [entry.config.name, entry]),
    )

    expect(
      indexes.get('extension_sessions_token_hash_idx')?.config.unique,
    ).toBe(true)
    expect(
      indexes.get('extension_sessions_user_created_idx')?.config.columns[0],
    ).toMatchObject({ name: 'user_id' })
    expect(
      indexes.get('extension_sessions_expiry_idx')?.config.where,
    ).toBeDefined()
  })
})
