import type { ComponentProps } from 'react'

import { cn } from '../lib/cn.js'

export type InputProps = ComponentProps<'input'>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'rounded-control border-subtle bg-sunken text-primary duration-fast placeholder:text-tertiary hover:border-strong focus:border-accent-strong focus:bg-surface focus:ring-focus/30 aria-invalid:border-danger-strong aria-invalid:ring-danger-strong/20 min-h-10 w-full border px-3 py-2 text-sm transition-[background-color,border-color,box-shadow] outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
