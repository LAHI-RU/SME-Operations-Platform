import { useId, type ComponentProps } from 'react'

type InputProps = ComponentProps<'input'> & {
  label: string
  hint?: string
  error?: string
}

export function Input({
  label,
  hint,
  error,
  id,
  className = '',
  required,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionIds = [
    describedBy,
    hint && `${inputId}-hint`,
    error && `${inputId}-error`,
  ].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-ink">
        {label}{required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
      </label>
      <input
        {...props}
        id={inputId}
        required={required}
        aria-describedby={descriptionIds}
        aria-invalid={error ? true : invalid}
        className={`block min-h-11 w-full rounded-lg border bg-surface px-3 py-2 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-neutral-soft disabled:text-muted ${error ? 'border-danger' : 'border-field-border'} ${className}`}
      />
      {hint && <p id={`${inputId}-hint`} className="text-sm text-muted">{hint}</p>}
      {error && <p id={`${inputId}-error`} role="alert" className="text-sm font-medium text-danger">{error}</p>}
    </div>
  )
}
