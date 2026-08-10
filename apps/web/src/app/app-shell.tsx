import {
  ArchiveIcon,
  BooksIcon,
  GearIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Button, IconButton } from '@cerebero/ui'

import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog'
import { ProfileMenu } from './profile-menu'
import { ThemeControl } from './theme-control'
import { useTheme } from './theme-context'
import { Wordmark } from './wordmark'
import { collectionItemsQueryOptions } from '../features/collections/data-access/use-collection-items-query'
import { defaultLibraryListFilters } from '../features/library/data-access/library-items-query-key'
import {
  pinnedLibraryItemsQueryOptions,
  paginatedLibraryItemsQueryOptions,
} from '../features/library/data-access/use-library-items-query'

type AppShellProps = {
  children: ReactNode
  isSigningOut: boolean
  openCapture: () => void
  signOut: () => void
  signOutError: string | null
  user: {
    email: string
    image: null | string
    name: string
  }
}

const expandedNavLinkClasses =
  'focus-visible:ring-focus focus-visible:ring-offset-surface flex min-h-11 items-center justify-start gap-2.5 rounded-control border-l-2 px-3 py-2.5 text-sm transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'

const collapsedNavLinkClasses =
  'focus-visible:ring-focus focus-visible:ring-offset-surface mx-auto flex size-11 items-center justify-center rounded-control border text-sm transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'

const sidebarStorageKey = 'cerebero-sidebar-collapsed'

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(sidebarStorageKey) === 'true'
  } catch {
    return false
  }
}

function storeSidebarCollapsed(isCollapsed: boolean): void {
  try {
    window.localStorage.setItem(sidebarStorageKey, String(isCollapsed))
  } catch {
    // The sidebar still works for this session when storage is unavailable.
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'SELECT' ||
    target.tagName === 'TEXTAREA'
  )
}

const navItems = [
  { icon: BooksIcon, label: 'Library', to: '/library' as const },
  { icon: ArchiveIcon, label: 'Archive', to: '/archive' as const },
  { icon: TrashIcon, label: 'Trash', to: '/trash' as const },
] as const

export function AppShell({
  children,
  isSigningOut,
  openCapture,
  signOut,
  signOutError,
  user,
}: AppShellProps) {
  const queryClient = useQueryClient()
  const { resolvedTheme, setTheme } = useTheme()
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(readSidebarCollapsed)

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((current) => !current)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setTheme])

  const prefetchNavigation = useCallback(
    (to: (typeof navItems)[number]['to'] | '/settings') => {
      if (to === '/library') {
        void Promise.all([
          queryClient.prefetchInfiniteQuery(
            pinnedLibraryItemsQueryOptions(defaultLibraryListFilters),
          ),
          queryClient.prefetchInfiniteQuery(
            paginatedLibraryItemsQueryOptions(defaultLibraryListFilters),
          ),
        ])
      } else if (to === '/archive') {
        void queryClient.prefetchInfiniteQuery(
          collectionItemsQueryOptions('archived'),
        )
      } else if (to === '/trash') {
        void queryClient.prefetchInfiniteQuery(
          collectionItemsQueryOptions('trashed'),
        )
      }
    },
    [queryClient],
  )

  useEffect(() => {
    storeSidebarCollapsed(isSidebarCollapsed)
  }, [isSidebarCollapsed])

  useEffect(() => {
    const toggleSidebarFromKeyboard = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.altKey ||
        event.key.toLowerCase() !== 'b' ||
        (!event.metaKey && !event.ctrlKey)
      ) {
        return
      }

      event.preventDefault()
      toggleSidebar()
    }

    document.addEventListener('keydown', toggleSidebarFromKeyboard)
    return () =>
      document.removeEventListener('keydown', toggleSidebarFromKeyboard)
  }, [toggleSidebar])

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing) {
        return
      }

      const hasPrimaryModifier = event.metaKey || event.ctrlKey
      const isShortcutHelp =
        hasPrimaryModifier &&
        !event.altKey &&
        !event.shiftKey &&
        (event.code === 'Slash' || event.key === '/')

      if (isShortcutHelp) {
        event.preventDefault()
        setIsKeyboardShortcutsOpen(true)
        return
      }

      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.key.toLowerCase() !== 'd' ||
        isEditableTarget(event.target)
      ) {
        return
      }

      event.preventDefault()
      toggleTheme()
    }

    document.addEventListener('keydown', handleGlobalShortcut)
    return () => document.removeEventListener('keydown', handleGlobalShortcut)
  }, [toggleTheme])

  return (
    <div
      className={`bg-canvas text-primary duration-standard min-h-dvh transition-[grid-template-columns] lg:grid ${
        isSidebarCollapsed
          ? 'lg:grid-cols-[4.75rem_minmax(0,1fr)]'
          : 'lg:grid-cols-[15rem_minmax(0,1fr)]'
      }`}
      data-sidebar-state={isSidebarCollapsed ? 'collapsed' : 'expanded'}
    >
      <KeyboardShortcutsDialog
        isOpen={isKeyboardShortcutsOpen}
        setIsOpen={setIsKeyboardShortcutsOpen}
      />

      <a
        className="bg-primary text-canvas focus-visible:ring-focus rounded-control fixed top-3 left-3 z-50 -translate-y-20 px-3 py-2 text-sm font-semibold transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:outline-none"
        href="#main-content"
      >
        Skip to content
      </a>

      <aside
        aria-label="Workspace sidebar"
        className={`border-border-subtle bg-surface duration-standard sticky top-0 z-40 hidden h-dvh border-r transition-[padding] lg:flex lg:flex-col ${
          isSidebarCollapsed ? 'p-3' : 'p-5'
        }`}
      >
        <div
          className={`flex items-center ${
            isSidebarCollapsed ? 'justify-center' : 'justify-start'
          }`}
        >
          <button
            aria-controls="desktop-workspace-sidebar"
            aria-expanded={!isSidebarCollapsed}
            aria-keyshortcuts="Meta+B Control+B"
            aria-label={
              isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
            }
            className="focus-visible:ring-focus rounded-control inline-flex size-11 shrink-0 items-center justify-center focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            onClick={toggleSidebar}
            title={`${isSidebarCollapsed ? 'Expand' : 'Collapse'} sidebar (⌘B / Ctrl+B)`}
            type="button"
          >
            <Wordmark compact />
          </button>
          {!isSidebarCollapsed ? (
            <Link
              aria-label="Cerebero Library"
              className="focus-visible:ring-focus rounded-control ml-3 w-fit focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              to="/library"
            >
              <span className="font-display text-xl font-semibold tracking-tight">
                Cerebero
              </span>
            </Link>
          ) : null}
        </div>

        {isSidebarCollapsed ? (
          <IconButton
            aria-keyshortcuts="C"
            className="bg-accent text-accent-foreground hover:bg-accent-strong hover:text-accent-contrast border-accent mx-auto mt-5 size-11"
            label="Capture"
            onClick={openCapture}
          >
            <PlusIcon aria-hidden="true" size={20} weight="bold" />
          </IconButton>
        ) : (
          <Button
            aria-keyshortcuts="C"
            aria-label="Capture"
            className="mt-8 w-full"
            onClick={openCapture}
          >
            <PlusIcon aria-hidden="true" size={17} weight="bold" />
            Capture
            <kbd
              className="border-accent-foreground/25 ml-auto border-l pl-2 font-mono text-[0.625rem] font-medium"
              aria-hidden="true"
            >
              C
            </kbd>
          </Button>
        )}

        <nav
          className={isSidebarCollapsed ? 'mt-3' : 'mt-6'}
          aria-label="Primary navigation"
          id="desktop-workspace-sidebar"
        >
          {!isSidebarCollapsed ? (
            <p className="text-tertiary px-3 font-mono text-[0.6875rem]">
              Workspace
            </p>
          ) : null}
          <div
            className={`${isSidebarCollapsed ? 'mt-1 gap-0.5' : 'mt-3 gap-1'} grid`}
          >
            {navItems.map((item) => {
              const Icon = item.icon
              const navLinkClasses = isSidebarCollapsed
                ? collapsedNavLinkClasses
                : expandedNavLinkClasses
              return (
                <Link
                  activeOptions={{ exact: true, includeSearch: false }}
                  activeProps={{
                    className: `${navLinkClasses} border-transparent text-primary font-semibold`,
                  }}
                  inactiveProps={{
                    className: `${navLinkClasses} border-transparent text-secondary hover:bg-sunken hover:text-primary`,
                  }}
                  aria-label={isSidebarCollapsed ? item.label : undefined}
                  key={item.to}
                  onFocus={() => prefetchNavigation(item.to)}
                  onPointerEnter={() => prefetchNavigation(item.to)}
                  preload="intent"
                  title={isSidebarCollapsed ? item.label : undefined}
                  to={item.to}
                >
                  <Icon
                    aria-hidden="true"
                    size={isSidebarCollapsed ? 20 : 18}
                    weight="bold"
                  />
                  {!isSidebarCollapsed ? item.label : null}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="border-border-subtle mt-auto border-t pt-3">
          <div
            className={isSidebarCollapsed ? 'flex justify-center pb-2' : 'pb-1'}
          >
            <ThemeControl showLabel={!isSidebarCollapsed} />
          </div>
          <ProfileMenu
            compact={isSidebarCollapsed}
            isSigningOut={isSigningOut}
            openKeyboardShortcuts={() => setIsKeyboardShortcutsOpen(true)}
            placement="above"
            signOut={signOut}
            signOutError={signOutError}
            user={user}
          />
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="border-border-subtle bg-canvas/95 sticky top-0 z-30 flex min-h-16 items-center justify-between border-b px-4 backdrop-blur-sm sm:px-6 lg:hidden">
          <Link
            aria-label="Cerebero Library"
            className="focus-visible:ring-focus rounded-control focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            to="/library"
          >
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1">
            <IconButton
              aria-keyshortcuts="C"
              label="Capture"
              onClick={openCapture}
            >
              <PlusIcon aria-hidden="true" size={19} weight="bold" />
            </IconButton>
            <ThemeControl />
            <ProfileMenu
              compact
              isSigningOut={isSigningOut}
              openKeyboardShortcuts={() => setIsKeyboardShortcutsOpen(true)}
              placement="below"
              signOut={signOut}
              signOutError={signOutError}
              user={user}
            />
          </div>
        </header>

        <nav
          className="border-border-subtle bg-canvas overflow-x-auto border-b lg:hidden"
          aria-label="Primary mobile navigation"
        >
          <div className="flex min-w-max gap-1 px-3 py-2">
            {[
              ...navItems,
              { icon: GearIcon, label: 'Settings', to: '/settings' as const },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Link
                  activeOptions={{ exact: true, includeSearch: false }}
                  activeProps={{
                    className: 'border-transparent text-primary font-semibold',
                  }}
                  className="rounded-control focus-visible:ring-focus inline-flex min-h-11 items-center gap-2 border border-transparent px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  inactiveProps={{
                    className:
                      'text-secondary hover:bg-sunken hover:text-primary',
                  }}
                  key={item.to}
                  onFocus={() => prefetchNavigation(item.to)}
                  onPointerEnter={() => prefetchNavigation(item.to)}
                  preload="intent"
                  to={item.to}
                >
                  <Icon aria-hidden="true" size={17} weight="bold" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {signOutError ? (
          <div
            className="border-danger-border bg-danger-soft text-danger-strong border-b px-4 py-2 text-sm lg:hidden"
            role="alert"
          >
            {signOutError}
          </div>
        ) : null}

        <main className="flex flex-1 flex-col" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export function AppShellLoading() {
  const isSidebarCollapsed = readSidebarCollapsed()

  return (
    <main
      className={`bg-canvas text-primary min-h-dvh lg:grid ${
        isSidebarCollapsed
          ? 'lg:grid-cols-[4.75rem_minmax(0,1fr)]'
          : 'lg:grid-cols-[15rem_minmax(0,1fr)]'
      }`}
      aria-busy="true"
    >
      <div
        className={`border-border-subtle bg-surface hidden border-r lg:block ${
          isSidebarCollapsed ? 'p-3' : 'p-5'
        }`}
      >
        {!isSidebarCollapsed ? <Wordmark /> : null}
      </div>
      <div>
        <div className="border-border-subtle flex min-h-16 items-center border-b px-4 lg:hidden">
          <Wordmark />
        </div>
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <p className="text-secondary text-sm">Opening your archive…</p>
        </div>
      </div>
    </main>
  )
}
