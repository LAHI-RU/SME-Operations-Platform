import type { ApiClient } from '../../lib/api/client'
import { ApiError } from '../../lib/api/error'
import { ORDER_STATUSES, type OrderStatus } from '../../types/order'

export const dashboardMetrics = [
  { status: 'SUBMITTED', label: 'Awaiting confirmation' },
  { status: 'PENDING_STOCK', label: 'Waiting for stock' },
  { status: 'CONFIRMED', label: 'Ready to pack' },
  { status: 'READY_FOR_DELIVERY', label: 'Ready for delivery' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
] as const satisfies readonly { status: OrderStatus; label: string }[]

export interface RecentOrder {
  id: number
  order_number: string
  status: OrderStatus
  customerName: string | null
  createdAt: string | null
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(): never {
  throw new ApiError('invalid_response', 'The server returned an invalid order summary.')
}

function page(value: unknown) {
  if (!record(value) || !Array.isArray(value.data) || !record(value.meta)
    || !Number.isSafeInteger(value.meta.total) || Number(value.meta.total) < value.data.length) invalid()
  return { rows: value.data as unknown[], total: value.meta.total as number }
}

function recentOrder(value: unknown): RecentOrder {
  if (!record(value) || !Number.isSafeInteger(value.id) || Number(value.id) < 1
    || typeof value.order_number !== 'string' || !value.order_number.trim()
    || !ORDER_STATUSES.includes(value.status as OrderStatus) || !record(value.customer)
    || (value.customer.name !== null && typeof value.customer.name !== 'string')
    || (value.created_at !== null && (typeof value.created_at !== 'string' || !Number.isFinite(Date.parse(value.created_at))))) invalid()
  return { id: value.id as number, order_number: value.order_number, status: value.status as OrderStatus, customerName: value.customer.name as string | null, createdAt: value.created_at as string | null }
}

export function createDashboardApi(client: ApiClient) {
  return {
    async recent(signal?: AbortSignal) {
      const result = page(await client.request<unknown>('/orders', { query: { page: 1, per_page: 5 }, signal }))
      if (result.rows.length > 5) invalid()
      return { total: result.total, orders: result.rows.map(recentOrder) }
    },
    async count(status: OrderStatus, signal?: AbortSignal) {
      return page(await client.request<unknown>('/orders', { query: { page: 1, per_page: 1, status }, signal })).total
    },
  }
}
