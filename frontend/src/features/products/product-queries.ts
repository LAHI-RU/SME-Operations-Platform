import { api } from '../../lib/api'
import { queryClient } from '../../lib/query-client'
import { createProductsApi } from './products-api'

export const productsApi = createProductsApi(api)
export const productDetailQuery = (id: number) => ({
  queryKey: ['products', 'detail', id], queryFn: ({ signal }: { signal: AbortSignal }) => productsApi.detail(id, signal),
})

export function invalidateProductLists() {
  void queryClient.invalidateQueries({ queryKey: ['products', 'list'] })
  void queryClient.invalidateQueries({ queryKey: ['inventory'] })
  void queryClient.invalidateQueries({ queryKey: ['orders'] })
}
