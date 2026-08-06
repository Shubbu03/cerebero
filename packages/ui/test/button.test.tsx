import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button, IconButton } from '../src/index.js'

describe('action primitives', () => {
  it('uses a safe button type by default', () => {
    render(<Button>Capture</Button>)
    expect(screen.getByRole('button', { name: 'Capture' })).toHaveAttribute(
      'type',
      'button',
    )
  })

  it('requires an accessible name for icon-only actions', () => {
    render(<IconButton label="Open search">S</IconButton>)
    expect(
      screen.getByRole('button', { name: 'Open search' }),
    ).toBeInTheDocument()
  })
})
