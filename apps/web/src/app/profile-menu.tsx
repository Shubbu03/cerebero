import {
  CaretUpDownIcon,
  GearIcon,
  KeyboardIcon,
  SignOutIcon,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'

type ProfileMenuProps = {
  compact?: boolean
  isSigningOut: boolean
  openKeyboardShortcuts: () => void
  placement: 'above' | 'below'
  signOut: () => void
  signOutError: string | null
  user: {
    email: string
    image: null | string
    name: string
  }
}

const menuItemClasses =
  'focus-visible:ring-focus hover:bg-sunken hover:text-primary flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-sm text-secondary transition-colors duration-fast focus-visible:ring-2 focus-visible:outline-none'

function getInitial(name: string, email: string): string {
  return (name.trim()[0] ?? email.trim()[0] ?? 'C').toUpperCase()
}

function getFirstName(name: string, email: string): string {
  return name.trim().split(/\s+/)[0] || email
}

function ProfileAvatar({
  email,
  image,
  name,
}: {
  email: string
  image: null | string
  name: string
}) {
  const [imageSource, setImageSource] = useState(image)

  return (
    <span className="border-border-strong bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border text-sm font-semibold">
      {imageSource ? (
        <img
          alt=""
          className="size-full object-cover"
          onError={() => setImageSource(null)}
          referrerPolicy="no-referrer"
          src={imageSource}
        />
      ) : (
        getInitial(name, email)
      )}
    </span>
  )
}

export function ProfileMenu({
  compact = false,
  isSigningOut,
  openKeyboardShortcuts,
  placement,
  signOut,
  signOutError,
  user,
}: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonId = useId()
  const menuId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={isOpen ? 'Close profile menu' : 'Open profile menu'}
        className={`focus-visible:ring-focus hover:bg-sunken rounded-control duration-fast flex min-h-11 items-center transition-colors focus-visible:ring-2 focus-visible:outline-none ${
          compact
            ? 'mx-auto justify-center p-1'
            : 'w-full gap-2.5 p-2 text-left'
        }`}
        id={buttonId}
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <ProfileAvatar email={user.email} image={user.image} name={user.name} />
        {!compact ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {getFirstName(user.name, user.email)}
              </span>
            </span>
            <CaretUpDownIcon
              aria-hidden="true"
              className="text-tertiary shrink-0"
              size={15}
            />
          </>
        ) : null}
      </button>

      {isOpen ? (
        <div
          aria-labelledby={buttonId}
          className={`border-border-strong bg-raised shadow-raised rounded-panel absolute z-[70] w-64 border p-2 ${
            placement === 'above'
              ? 'bottom-[calc(100%+0.75rem)] left-0'
              : 'top-[calc(100%+0.75rem)] right-0'
          }`}
          id={menuId}
          role="menu"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-tertiary mt-0.5 truncate text-xs">
              {user.email}
            </p>
          </div>

          <div className="border-border-subtle mt-1 border-t pt-1">
            <Link
              className={menuItemClasses}
              onClick={() => setIsOpen(false)}
              role="menuitem"
              to="/settings"
            >
              <GearIcon aria-hidden="true" size={19} weight="bold" />
              Settings
            </Link>
            <button
              aria-keyshortcuts="Meta+/ Control+/"
              className={menuItemClasses}
              onClick={() => {
                setIsOpen(false)
                openKeyboardShortcuts()
              }}
              role="menuitem"
              type="button"
            >
              <KeyboardIcon aria-hidden="true" size={19} weight="bold" />
              Keyboard shortcuts
            </button>
          </div>

          <div className="border-border-subtle mt-1 border-t pt-1">
            <button
              className={menuItemClasses}
              disabled={isSigningOut}
              onClick={() => {
                setIsOpen(false)
                signOut()
              }}
              role="menuitem"
              type="button"
            >
              <SignOutIcon aria-hidden="true" size={19} />
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>

          {signOutError ? (
            <p className="text-danger-strong px-3 pt-2 text-xs" role="alert">
              {signOutError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
