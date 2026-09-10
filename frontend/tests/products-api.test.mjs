import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { createServer } from 'vite'

let vite, createProductsApi
const product = { id: 1, sku: 'SKU-1', name: 'Product', description: null, cost_price: '0.00', selling_price: '1234567890.12', reorder_level: 0, is_active: true, category: { id: 16, name: 'Category' }, inventory: { quantity: 7 }, created_at: null, updated_at: null }
const values = { category_id: '16', sku: ' SKU-1 ', name: ' Product ', description: ' ', cost_price: '0.00', selling_price: '1234567890.12', reorder_level: '0', is_active: false, quantity: 99 }
before(async () => {
  vite = await createServer({ cacheDir: 'node_modules/.vite-test-products-api', server: { middlewareMode: true, ws: false, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
  ;({ createProductsApi } = await vite.ssrLoadModule('/src/features/products/products-api.ts'))
})
after(async () => { await vite?.close() })

test('product and category lists request only the backend page parameter and forward cancellation', async () => {
  const signal = new AbortController().signal
  const paths = []
  const api = createProductsApi({ request: async (path, options) => {
    paths.push(path)
    assert.deepEqual(options.query, { page: 2 })
    assert.equal(options.signal, signal)
    return { data: path === '/products' ? [product] : [{ id: 16, name: 'Later category', is_active: false }], meta: { current_page: 2, last_page: 2, per_page: 15, total: 16 } }
  } })
  assert.equal((await api.list(2, signal)).meta.total, 16)
  assert.equal((await api.categories(2, signal)).data[0].is_active, false)
  assert.deepEqual(paths, ['/products', '/categories'])
})

test('create sends the exact writable fields, preserving decimal strings and excluding stock and active state', async () => {
  const api = createProductsApi({ request: async (path, options) => {
    assert.equal(path, '/products')
    assert.equal(options.method, 'POST')
    assert.deepEqual(options.body, { category_id: 16, sku: 'SKU-1', name: 'Product', description: null, cost_price: '0.00', selling_price: '1234567890.12', reorder_level: 0 })
    return { data: product }
  } })
  assert.equal((await api.save(values)).selling_price, '1234567890.12')
})

test('update sends a full PUT including false active state and uses the saved resource', async () => {
  const api = createProductsApi({ request: async (path, options) => {
    assert.equal(path, '/products/1')
    assert.equal(options.method, 'PUT')
    assert.equal(options.body.is_active, false)
    assert.equal(Object.keys(options.body).length, 8)
    return { data: { ...product, is_active: false } }
  } })
  assert.equal((await api.save(values, 1)).is_active, false)
})

test('detail preserves nullable relations and rejects malformed catalog resources', async () => {
  for (const invalid of [{ ...product, cost_price: 12 }, { ...product, inventory: null }, { ...product, is_active: 1 }, { ...product, category: null }, { ...product, created_at: 'bad' }]) {
    const api = createProductsApi({ request: async () => ({ data: invalid }) })
    await assert.rejects(api.detail(1), (error) => error.kind === 'invalid_response')
  }
  const api = createProductsApi({ request: async () => ({ data: { ...product, category: { id: null, name: null } } }) })
  assert.equal((await api.detail(1)).category.id, null)
})

test('delete requires the backend success envelope instead of accepting arbitrary JSON', async () => {
  for (const data of [{ success: false, message: 'No', data: null }, { data: product }]) {
    await assert.rejects(createProductsApi({ request: async () => data }).remove(1), (error) => error.kind === 'invalid_response')
  }
  await createProductsApi({ request: async (path, options) => {
    assert.equal(path, '/products/1'); assert.equal(options.method, 'DELETE')
    return { success: true, message: 'Deleted', data: null }
  } }).remove(1)
})
