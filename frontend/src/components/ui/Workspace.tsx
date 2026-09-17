import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Inbox, RefreshCw, X } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from './Card'
import { Button } from './Button'
import { controlStyle, errorMessage } from '../../features/operations/helpers'
import type { PageMeta } from '../../features/operations/api'

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-bold tracking-[0.16em] text-brand uppercase">{eyebrow}</p>
        <h1 className="text-3xl font-bold tracking-tight break-words sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  )
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-neutral-soft text-muted">
        <Inbox aria-hidden="true" className="size-6" />
      </span>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}
export function RequestState({
  error,
  retry,
  paused,
}: {
  error?: unknown
  retry?: () => void
  paused?: boolean
}) {
  return (
    <Card aria-label="Request status">
      {error ? (
        <>
          <p role="alert" className="text-sm text-danger">
            {errorMessage(error)}
          </p>
          {retry && (
            <Button variant="secondary" className="mt-4" onClick={retry}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          )}
        </>
      ) : (
        <div role="status" className="space-y-4">
          <p className="text-sm text-muted">
            {paused ? 'Waiting for a network connection...' : 'Loading records...'}
          </p>
          {[100, 80, 60].map((width) => (
            <div
              key={width}
              className="h-5 rounded bg-neutral-soft motion-safe:animate-pulse"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
export function Pagination({
  meta,
  page,
  onPage,
  busy,
}: {
  meta: PageMeta
  page: number
  onPage: (page: number) => void
  busy?: boolean
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"
    >
      <p className="text-sm text-muted">
        Page <span className="font-semibold text-ink">{page}</span> of {meta.last_page}{' '}
        <span className="mx-2">·</span> {meta.total.toLocaleString()} records
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={busy || page <= 1}
          onClick={() => onPage(Math.max(1, Math.min(page - 1, meta.last_page)))}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={busy || page >= meta.last_page}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
export function DataTable({
  label,
  headings,
  children,
}: {
  label: string
  headings: string[]
  children: ReactNode
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="relative mb-5 overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-brand"
    >
      <table className="workspace-table w-full text-left text-sm">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {headings.map((heading) => (
              <th key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
export function Select({
  label,
  error,
  children,
  ...props
}: ComponentProps<'select'> & { label: string; error?: string }) {
  const id = useId()
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
        {props.required && (
          <span aria-hidden="true" className="ml-1 text-danger">
            *
          </span>
        )}
      </label>
      <select
        {...props}
        id={id}
        className={controlStyle}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {children}
      </select>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
export function Textarea({
  label,
  error,
  ...props
}: ComponentProps<'textarea'> & { label: string; error?: string }) {
  const id = useId()
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <textarea
        {...props}
        id={id}
        rows={props.rows ?? 4}
        className={controlStyle}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted hover:text-brand"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  )
}
export function ConfirmDialog({
  title,
  children,
  pending,
  onCancel,
  onConfirm,
  destructive = false,
  error,
}: {
  title: string
  children: ReactNode
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
  destructive?: boolean
  error?: unknown
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement as HTMLElement | null
    if (element?.showModal) element.showModal()
    else element?.setAttribute('open', '')
    element?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus()
    return () => {
      element?.close?.()
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onCancel()
      }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-line bg-surface p-6 text-ink shadow-2xl backdrop:bg-slate-950/45"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={titleId} className="text-xl font-bold">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close confirmation"
          disabled={pending}
          onClick={onCancel}
          className="grid min-h-11 min-w-11 place-items-center rounded-lg p-2 hover:bg-canvas"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="my-5 text-sm text-muted">{children}</div>
      {Boolean(error) && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {errorMessage(error)}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button data-cancel variant="secondary" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} loading={pending} onClick={onConfirm}>
          {destructive ? 'Delete record' : 'Confirm'}
        </Button>
      </div>
    </dialog>
  )
}
