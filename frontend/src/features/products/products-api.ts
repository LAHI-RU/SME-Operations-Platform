import { z } from 'zod'
import type { ApiClient } from '../../lib/api/client'
import { ApiError } from '../../lib/api/error'

const id = z.number().int().positive()
const decimal = z.string().regex(/^\d+\.\d{2}$/)
const date = z.string().refine((value) => Number.isFinite(Date.parse(value))).nullable()
export const productSchema = z.object({
  id, sku: z.string(), name: z.string(), description: z.string().nullable(),
  cost_price: decimal, selling_price: decimal, reorder_level: z.number().int().nonnegative(), is_active: z.boolean(),
  category: z.object({ id: id.nullable(), name: z.string().nullable() }),
  inventory: z.object({ quantity: z.number().int() }), created_at: date, updated_at: date,
})
const categorySchema = z.object({ id, name: z.string(), is_active: z.boolean() })
const metaSchema = z.object({ current_page: id, last_page: id, per_page: id, total: z.number().int().nonnegative() })
const productPage = z.object({ data: z.array(productSchema), meta: metaSchema })
const categoryPage = z.object({ data: z.array(categorySchema), meta: metaSchema })
export type Product = z.infer<typeof productSchema>
export interface ProductValues {
  category_id: string; sku: string; name: string; description: string
  cost_price: string; selling_price: string; reorder_level: string; is_active: boolean
}

function decode<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new ApiError('invalid_response', 'The server returned an invalid catalog response.')
  return parsed.data
}

export function productPayload(values: ProductValues, editing: boolean) {
  return {
    category_id: Number(values.category_id), sku: values.sku.trim(), name: values.name.trim(),
    description: values.description.trim() || null,
    cost_price: values.cost_price.trim(), selling_price: values.selling_price.trim(),
    reorder_level: Number(values.reorder_level), ...(editing ? { is_active: values.is_active } : {}),
  }
}

export function createProductsApi(client: ApiClient) {
  return {
    async list(page: number, signal?: AbortSignal) {
      return decode(productPage, await client.request<unknown>('/products', { query: { page }, signal }))
    },
    async detail(productId: number, signal?: AbortSignal) {
      return decode(z.object({ data: productSchema }), await client.request<unknown>(`/products/${productId}`, { signal })).data
    },
    async categories(page: number, signal?: AbortSignal) {
      return decode(categoryPage, await client.request<unknown>('/categories', { query: { page }, signal }))
    },
    async save(values: ProductValues, productId?: number) {
      const result = await client.request<unknown>(productId ? `/products/${productId}` : '/products', {
        method: productId ? 'PUT' : 'POST', body: productPayload(values, productId !== undefined),
      })
      return decode(z.object({ data: productSchema }), result).data
    },
    async remove(productId: number) {
      decode(z.object({ success: z.literal(true), message: z.string(), data: z.null() }), await client.request<unknown>(`/products/${productId}`, { method: 'DELETE' }))
    },
  }
}
