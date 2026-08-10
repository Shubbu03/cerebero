import type { TagView } from '@cerebero/contracts'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TagManagementPanel } from '../src/features/tags/ui/tag-management-panel'

function createTags(count: number): TagView[] {
  return Array.from({ length: count }, (_, index) => ({
    createdAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')}T08:30:00.000Z`,
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    name: `Tag ${index + 1}`,
  }))
}

afterEach(cleanup)

describe('Tag management panel', () => {
  it('shows a four-by-five page of tags and paginates the remainder', () => {
    render(
      <TagManagementPanel
        createTag={vi.fn()}
        deleteTag={vi.fn()}
        isBusy={false}
        renameTag={vi.fn()}
        tags={createTags(21)}
      />,
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(20)
    expect(screen.getByText('#Tag 1')).toBeInTheDocument()
    expect(screen.queryByText('#Tag 21')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Rename #Tag 1' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Delete #Tag 1' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next Tags page' }))

    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('#Tag 21')).toBeInTheDocument()
    expect(screen.queryByText('#Tag 1')).not.toBeInTheDocument()
  })

  it('renames and confirms deletion with icon actions', async () => {
    const renameTag = vi.fn().mockResolvedValue(undefined)
    const deleteTag = vi.fn().mockResolvedValue(undefined)
    render(
      <TagManagementPanel
        createTag={vi.fn()}
        deleteTag={deleteTag}
        isBusy={false}
        renameTag={renameTag}
        tags={createTags(1)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Rename #Tag 1' }))
    const input = screen.getByRole('textbox', { name: 'Rename #Tag 1' })
    expect(input).toHaveValue('Tag 1')
    expect(input.parentElement).toHaveTextContent('#')
    fireEvent.change(input, { target: { value: '#Renamed tag' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'Save rename for #Tag 1' }),
    )
    await waitFor(() => {
      expect(renameTag).toHaveBeenCalledWith(
        '10000000-0000-4000-8000-000000000001',
        'Renamed tag',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete #Tag 1' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm delete #Tag 1' }),
    )
    await waitFor(() => {
      expect(deleteTag).toHaveBeenCalledWith(
        '10000000-0000-4000-8000-000000000001',
      )
    })
  })

  it('creates a new tag from the compact inline form', async () => {
    const createTag = vi.fn().mockResolvedValue(undefined)
    render(
      <TagManagementPanel
        createTag={createTag}
        deleteTag={vi.fn()}
        isBusy={false}
        renameTag={vi.fn()}
        tags={createTags(1)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'New tag' }))
    const input = screen.getByRole('textbox', { name: 'New tag name' })
    expect(input).toHaveAttribute('placeholder', 'tag-name')
    expect(input.parentElement).toHaveTextContent('#')
    fireEvent.change(input, { target: { value: '  #Research  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create tag' }))

    await waitFor(() => {
      expect(createTag).toHaveBeenCalledWith('Research')
    })
  })
})
