import { XIcon } from '@phosphor-icons/react'
import * as Dialog from '@radix-ui/react-dialog'
import { IconButton } from '@cerebero/ui'

type KeyboardShortcutsDialogProps = {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

type Shortcut = {
  combinations: ReadonlyArray<ReadonlyArray<string>>
  label: string
}

type ShortcutGroup = {
  label: string
  shortcuts: ReadonlyArray<Shortcut>
}

function getPrimaryModifierLabel(): string {
  return /Mac|iPhone|iPad|iPod/i.test(window.navigator.platform) ? '⌘' : 'Ctrl'
}

function getKeyLabel(key: string): string {
  const labels: Record<string, string> = {
    '⌘': 'Command',
    '↑': 'Up arrow',
    '↓': 'Down arrow',
    Ctrl: 'Control',
    Esc: 'Escape',
  }

  return labels[key] ?? key
}

function ShortcutKeys({ combinations }: Pick<Shortcut, 'combinations'>) {
  return (
    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      {combinations.map((keys, combinationIndex) => (
        <span className="flex items-center gap-1.5" key={keys.join('-')}>
          {combinationIndex > 0 ? (
            <span className="text-tertiary px-0.5 text-[0.6875rem]">or</span>
          ) : null}
          <span
            aria-label={keys.map(getKeyLabel).join(' plus ')}
            className="flex items-center gap-1"
          >
            {keys.map((key) => (
              <kbd
                aria-hidden="true"
                className="border-border-subtle bg-sunken text-primary grid min-h-8 min-w-8 place-items-center rounded-md border px-2 font-mono text-xs font-semibold shadow-sm"
                key={key}
              >
                {key}
              </kbd>
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}

export function KeyboardShortcutsDialog({
  isOpen,
  setIsOpen,
}: KeyboardShortcutsDialogProps) {
  const modifier = getPrimaryModifierLabel()
  const groups: ReadonlyArray<ShortcutGroup> = [
    {
      label: 'General',
      shortcuts: [
        { combinations: [['C']], label: 'Open capture' },
        { combinations: [[modifier, 'K']], label: 'Search your collection' },
        { combinations: [[modifier, 'B']], label: 'Toggle sidebar' },
        { combinations: [['D']], label: 'Toggle theme' },
        {
          combinations: [[modifier, '/']],
          label: 'Keyboard shortcuts',
        },
        { combinations: [['Esc']], label: 'Close an open dialog or menu' },
      ],
    },
    {
      label: 'Search',
      shortcuts: [
        { combinations: [['↑'], ['↓']], label: 'Navigate results' },
        { combinations: [['Enter']], label: 'Open selected result' },
      ],
    },
    {
      label: 'Capture',
      shortcuts: [
        {
          combinations: [['Enter'], ['S']],
          label: 'Save to Library',
        },
      ],
    },
  ]

  return (
    <Dialog.Root onOpenChange={setIsOpen} open={isOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-primary/45 fixed inset-0 z-[70] backdrop-blur-[2px]" />
        <Dialog.Content className="bg-canvas text-primary border-border-strong shadow-raised rounded-panel fixed top-1/2 left-1/2 z-[80] flex max-h-[min(86dvh,46rem)] w-[min(calc(100vw-2rem),40rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border focus:outline-none">
          <header className="border-border-subtle flex items-start justify-between gap-6 border-b px-5 py-5 sm:px-7 sm:py-6">
            <div>
              <Dialog.Title className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Keyboard shortcuts
              </Dialog.Title>
              <Dialog.Description className="text-secondary mt-2 text-sm leading-6">
                Work through Cerebero without leaving the keyboard.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <IconButton className="shrink-0" label="Close keyboard shortcuts">
                <XIcon aria-hidden="true" size={19} />
              </IconButton>
            </Dialog.Close>
          </header>

          <div className="overflow-y-auto px-5 py-2 sm:px-7">
            {groups.map((group) => (
              <section className="py-4" key={group.label}>
                <h2 className="text-primary text-sm font-semibold">
                  {group.label}
                </h2>
                <ul className="divide-border-subtle mt-2 divide-y">
                  {group.shortcuts.map((shortcut) => (
                    <li
                      className="flex min-h-14 items-center justify-between gap-5 py-2.5"
                      key={shortcut.label}
                    >
                      <span className="text-secondary text-sm leading-5">
                        {shortcut.label}
                      </span>
                      <ShortcutKeys combinations={shortcut.combinations} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
