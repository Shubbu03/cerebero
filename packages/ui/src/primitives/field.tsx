import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'

type FieldProps = {
  children: ReactNode
  className?: string
  description?: string | undefined
  error?: string | undefined
  htmlFor: string
  label: string
}

export function Field({
  children,
  className,
  description,
  error,
  htmlFor,
  label,
}: FieldProps) {
  const descriptionId = description ? `${htmlFor}-description` : undefined

  return (
    <div className={cn('grid gap-2', className)}>
      <label className="text-primary text-sm font-semibold" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {description ? (
        <p className="text-tertiary text-xs leading-relaxed" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <FormMessage id={`${htmlFor}-error`}>{error}</FormMessage>
      ) : null}
    </div>
  )
}

type FormMessageProps = {
  children: ReactNode
  id?: string | undefined
}

export function FormMessage({ children, id }: FormMessageProps) {
  return (
    <p className="text-danger-strong text-xs font-medium" id={id} role="alert">
      {children}
    </p>
  )
}
