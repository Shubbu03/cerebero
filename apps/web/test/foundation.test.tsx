import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ThemeProvider } from '../src/app/theme-provider'
import { FoundationRoute } from '../src/routes/index'

describe('Phase 0 visual foundation', () => {
  it('communicates the product workflow with accessible controls', () => {
    render(
      <ThemeProvider>
        <FoundationRoute />
      </ThemeProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Remember what mattered.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Cerebero workflow preview' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Theme')).toHaveValue('system')
  })
})
