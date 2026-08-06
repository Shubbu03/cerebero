import type { UseFormRegisterReturn } from 'react-hook-form'
import { Field, Input } from '@cerebero/ui'

type AuthFormFieldProps = {
  autoComplete: string
  error?: string | undefined
  label: string
  name: string
  placeholder?: string | undefined
  registration: UseFormRegisterReturn
  type?: 'email' | 'password' | 'text'
}

export function AuthFormField({
  autoComplete,
  error,
  label,
  name,
  placeholder,
  registration,
  type = 'text',
}: AuthFormFieldProps) {
  const descriptionIds = [error ? `${name}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <Field error={error} htmlFor={name} label={label}>
      <Input
        {...registration}
        aria-describedby={descriptionIds || undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        id={name}
        placeholder={placeholder}
        type={type}
      />
    </Field>
  )
}
