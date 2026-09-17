import { ApiError } from '../../lib/api'
import { queryClient } from '../../lib/query-client'

export const linkStyle =
  'inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand'
export const controlStyle =
  'block min-h-11 w-full rounded-lg border border-field-border bg-surface px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:bg-neutral-soft'
export const pageNumber = (value: string | null) =>
  Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : 1
export const validId = (value: string | undefined) =>
  /^\d+$/.test(value ?? '') && Number.isSafeInteger(Number(value)) && Number(value) > 0
export const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'The request could not be completed. Please try again.'
export const displayDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded'
export const humanize = (value: string) =>
  value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (char) => char.toUpperCase())
export function refreshOperations() {
  for (const key of ['orders', 'dashboard', 'inventory', 'products'])
    void queryClient.invalidateQueries({ queryKey: [key] })
}
// Price previews use integer minor units; persisted order totals always come from Laravel.
export function previewTotal(items: { price: string; quantity: number }[]) {
  const cents = items.reduce((sum, item) => {
    const [whole, fraction] = item.price.split('.')
    if (!/^\d+\.\d{2}$/.test(item.price) || !Number.isSafeInteger(item.quantity) || item.quantity < 0)
      return sum
    return sum + (BigInt(whole) * 100n + BigInt(fraction)) * BigInt(item.quantity)
  }, 0n)
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}
