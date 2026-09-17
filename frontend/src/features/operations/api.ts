import { z } from 'zod'
import { api, ApiError } from '../../lib/api'
import type { ApiClient } from '../../lib/api/client'
import { ORDER_STATUSES } from '../../types/order'

const id = z.number().int().positive()
const date = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)))
  .nullable()
const money = z.string().regex(/^\d+\.\d{2}$/)
const nullableText = z.string().nullable()
export const metaSchema = z.object({
  current_page: id,
  last_page: id,
  per_page: id,
  total: z.number().int().nonnegative(),
})
export type PageMeta = z.infer<typeof metaSchema>
export const directoryKinds = ['categories', 'customers', 'suppliers'] as const
export type DirectoryKind = (typeof directoryKinds)[number]
const common = { id, name: z.string(), is_active: z.boolean(), created_at: date, updated_at: date }
const category = z.object({ ...common, description: nullableText })
const customer = z.object({
  ...common,
  customer_code: z.string(),
  phone: z.string(),
  email: nullableText,
  address: nullableText,
})
const supplier = customer
  .omit({ customer_code: true })
  .extend({ supplier_code: z.string(), contact_person: nullableText })
export type DirectoryRecord = z.infer<typeof category> | z.infer<typeof customer> | z.infer<typeof supplier>
const schemas = { categories: category, customers: customer, suppliers: supplier }
export const inventorySchema = z.object({
  id,
  product_id: id,
  quantity: z.number().int(),
  product: z.object({ id: id.nullable(), sku: nullableText, name: nullableText }),
  updated_at: date,
})
export const transactionTypes = ['PURCHASE', 'RETURN', 'ADJUSTMENT_IN', 'SALE', 'ADJUSTMENT_OUT'] as const
const transactionSchema = z.object({
  id,
  product_id: id,
  type: z.enum(transactionTypes),
  quantity: z.number().int(),
  reference_type: nullableText,
  reference_id: id.nullable(),
  notes: nullableText,
  created_by: id.nullable(),
  created_at: date,
})
export const orderSchema = z.object({
  id,
  order_number: z.string(),
  status: z.enum(ORDER_STATUSES),
  customer: z.object({ id: id.nullable(), customer_code: nullableText, name: nullableText }),
  items: z.array(
    z.object({
      id,
      product_id: id,
      sku: nullableText,
      product_name: nullableText,
      quantity: z.number().int().positive(),
      unit_price: money,
      subtotal: money,
    }),
  ),
  total_amount: money,
  notes: nullableText,
  order_date: date,
  created_at: date,
  updated_at: date,
})
export type Order = z.infer<typeof orderSchema>
const fulfillmentSchema = z.object({
  id,
  sales_order_id: id,
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
  started_at: date,
  completed_at: date,
  packed_by: id.nullable(),
  notes: nullableText,
})
const deliverySchema = z.object({
  id,
  sales_order_id: id,
  status: z.enum(['PENDING', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED']),
  assigned_to: id.nullable(),
  assigned_at: date,
  out_for_delivery_at: date,
  delivered_at: date,
  notes: nullableText,
})
export type Delivery = z.infer<typeof deliverySchema>
export type OrderAction =
  | 'submit'
  | 'confirm'
  | 'fulfillment/start'
  | 'fulfillment/complete'
  | 'delivery/assign'
  | 'delivery/start'
  | 'delivery/complete'
export interface DraftOrder {
  customer_id: number
  items: { product_id: number; quantity: number }[]
  notes: string | null
}
export interface StockChange {
  quantity: number
  type: (typeof transactionTypes)[number]
  notes: string | null
  reference_type?: string | null
  reference_id?: number | null
}
export function decode<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success)
    throw new ApiError(
      'invalid_response',
      'The server returned an unexpected response. Refresh and try again.',
    )
  return result.data
}
export function createOperationsApi(client: ApiClient) {
  const resource = async <T>(
    schema: z.ZodType<T>,
    path: string,
    options?: Parameters<ApiClient['request']>[1],
  ) => decode(z.object({ data: schema }), await client.request(path, options)).data
  return {
    directoryList: async (kind: DirectoryKind, page: number, signal?: AbortSignal) =>
      decode(
        z.object({ data: z.array(schemas[kind] as z.ZodType<DirectoryRecord>), meta: metaSchema }),
        await client.request(`/${kind}`, { query: { page }, signal }),
      ),
    directoryDetail: (kind: DirectoryKind, id: number, signal?: AbortSignal) =>
      resource(schemas[kind] as z.ZodType<DirectoryRecord>, `/${kind}/${id}`, { signal }),
    directorySave: (kind: DirectoryKind, body: Record<string, unknown>, id?: number) =>
      resource(schemas[kind] as z.ZodType<DirectoryRecord>, `/${kind}${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        body,
      }),
    async directoryDelete(kind: DirectoryKind, id: number) {
      decode(
        z.object({ success: z.literal(true), message: z.string(), data: z.null() }),
        await client.request(`/${kind}/${id}`, { method: 'DELETE' }),
      )
    },
    inventory: (id: number, signal?: AbortSignal) =>
      resource(inventorySchema, `/inventory/${id}`, { signal }),
    transactions: async (id: number, page: number, signal?: AbortSignal) =>
      decode(
        z.object({ data: z.array(transactionSchema), meta: metaSchema }),
        await client.request(`/inventory/${id}/transactions`, { query: { page }, signal }),
      ),
    stock: (id: number, direction: 'in' | 'out', body: StockChange) =>
      resource(inventorySchema, `/inventory/${id}/stock-${direction}`, { method: 'POST', body }),
    orders: async (
      query: { page: number; status?: string; search?: string; customer_id?: number; per_page?: number },
      signal?: AbortSignal,
    ) =>
      decode(
        z.object({ data: z.array(orderSchema), meta: metaSchema }),
        await client.request('/orders', { query, signal }),
      ),
    order: (id: number, signal?: AbortSignal) => resource(orderSchema, `/orders/${id}`, { signal }),
    createOrder: (body: DraftOrder) => resource(orderSchema, '/orders', { method: 'POST', body }),
    delivery: (id: number, signal?: AbortSignal) =>
      resource(deliverySchema, `/orders/${id}/delivery`, { signal }),
    async action(id: number, action: OrderAction, body?: { notes?: string | null; assigned_to?: number }) {
      const result = await client.request(`/orders/${id}/${action}`, {
        method: 'POST',
        ...(body ? { body } : {}),
      })
      if (action.startsWith('delivery/')) return decode(z.object({ data: deliverySchema }), result).data
      if (action.startsWith('fulfillment/')) return decode(z.object({ data: fulfillmentSchema }), result).data
      return decode(z.object({ data: orderSchema }), result).data
    },
  }
}
export const operationsApi = createOperationsApi(api)
