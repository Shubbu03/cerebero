import type { ComponentProps, ReactNode } from 'react'

import { cn } from '../lib/cn.js'

export type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  children: ReactNode
  label: string
}

export function IconButton({
  children,
  className,
  label,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        'rounded-control text-secondary duration-fast hover:bg-sunken hover:text-primary focus-visible:ring-focus focus-visible:ring-offset-canvas inline-flex size-10 items-center justify-center border border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      title={label}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
