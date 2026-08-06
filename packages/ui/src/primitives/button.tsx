import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../lib/cn.js'

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-control border text-sm font-semibold transition-[background-color,border-color,color,transform] duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50 motion-safe:active:translate-y-px',
  {
    variants: {
      size: {
        compact: 'min-h-8 px-3 text-xs',
        default: 'px-4 py-2',
        large: 'min-h-11 px-5 py-2.5',
      },
      variant: {
        accent:
          'border-accent bg-accent text-accent-foreground hover:border-accent-strong hover:bg-accent-strong hover:text-accent-contrast',
        ghost:
          'border-transparent bg-transparent text-secondary hover:bg-sunken hover:text-primary',
        outline:
          'border-strong bg-surface text-primary hover:border-accent-strong hover:bg-sunken',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'accent',
    },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants>

export function Button({
  className,
  size,
  type = 'button',
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ className, size, variant }))}
      type={type}
      {...props}
    />
  )
}
