import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ThemeProvider } from '../src/app/theme-provider'
import { LandingRoute } from '../src/routes/index'

describe('Landing page', () => {
  it('presents the locked editorial structure with product proof', () => {
    render(
      <ThemeProvider>
        <LandingRoute />
      </ThemeProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Remember what mattered.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /A private place to capture links and notes, review them with care/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Start your archive/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(
      screen.getByRole('region', { name: 'Cerebero workflow preview' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Capture' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Rediscover' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Legal' })).toBeInTheDocument()
    expect(screen.getByLabelText('Theme')).toHaveValue('system')
  })
})
