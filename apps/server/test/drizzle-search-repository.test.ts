import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { createSearchExpressions } from '../src/modules/search/drizzle-search-repository.js'

const dialect = new PgDialect()

describe('Drizzle search repository query', () => {
  it('matches title, URL, note, and tag fragments with a prefix-aware query', () => {
    const { matchExpression } = createSearchExpressions('owner-1', 'shippu')
    const compiled = dialect.sqlToQuery(matchExpression)

    expect(compiled.sql).toContain('to_tsquery(')
    expect(compiled.sql).toContain("quote_literal(search_lexeme) || ':*'")
    expect(compiled.sql).toContain('"items"."authored_title"')
    expect(compiled.sql).toContain('"items"."original_url"')
    expect(compiled.sql).toContain('"items"."normalized_url"')
    expect(compiled.sql).toContain('"items"."note_markdown"')
    expect(compiled.sql).toContain('"tags"."name"')
    expect(compiled.params).toContain('%shippu%')
  })

  it('treats wildcard characters as literal search text', () => {
    const { matchExpression } = createSearchExpressions('owner-1', '100%_done')
    const compiled = dialect.sqlToQuery(matchExpression)

    expect(compiled.params).toContain('%100\\%\\_done%')
  })

  it('uses only the owner-scoped tag predicate for tag search', () => {
    const { matchExpression } = createSearchExpressions(
      'owner-1',
      'git',
      'tags',
    )
    const compiled = dialect.sqlToQuery(matchExpression)

    expect(compiled.sql).toContain('exists (')
    expect(compiled.sql).toContain('"tags"."name"')
    expect(compiled.sql).not.toContain('"items"."authored_title"')
    expect(compiled.sql).not.toContain('"items"."note_markdown"')
    expect(compiled.params).toContain('%git%')
  })
})
