import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { createServer } from 'vite'

let vite, createDashboardApi, metrics
const order = { id: 101, order_number: 'SO-0101', status: 'PENDING_STOCK', customer: { name: 'Example Customer' }, created_at: '2026-09-10T06:30:00.000Z' }
before(async () => {
  vite = await createServer({ cacheDir: 'node_modules/.vite-test-dashboard', server: { middlewareMode: true, ws: false, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
  const module = await vite.ssrLoadModule('/src/features/dashboard/dashboard-api.ts')
  createDashboardApi = module.createDashboardApi
  metrics = module.dashboardMetrics
})
after(async () => { await vite?.close() })

test('recent orders request five records and use paginator total, not page length', async () => {
  const signal = new AbortController().signal
  const api = createDashboardApi({ request: async (path, options) => {
    assert.equal(path, '/orders')
    assert.deepEqual(options.query, { page: 1, per_page: 5 })
    assert.equal(options.signal, signal)
    return { data: [order], meta: { total: 120 } }
  } })
  const result = await api.recent(signal)
  assert.equal(result.total, 120)
  assert.equal(result.orders.length, 1)
  assert.equal(result.orders[0].status, 'PENDING_STOCK')
})

test('five metrics use exact backend status filters and minimal pages', async () => {
  assert.deepEqual(metrics.map((metric) => metric.status), ['SUBMITTED', 'PENDING_STOCK', 'CONFIRMED', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'])
  for (const { status } of metrics) {
    const api = createDashboardApi({ request: async (path, options) => {
      assert.equal(path, '/orders')
      assert.deepEqual(options.query, { page: 1, per_page: 1, status })
      return { data: [], meta: { total: 42 } }
    } })
    assert.equal(await api.count(status), 42)
  }
})

test('valid empty results are zero and nullable customer/date fields are preserved', async () => {
  const empty = createDashboardApi({ request: async () => ({ data: [], meta: { total: 0 } }) })
  assert.deepEqual(await empty.recent(), { total: 0, orders: [] })
  const nullable = createDashboardApi({ request: async () => ({ data: [{ ...order, customer: { name: null }, created_at: null }], meta: { total: 1 } }) })
  const result = await nullable.recent()
  assert.equal(result.orders[0].customerName, null)
  assert.equal(result.orders[0].createdAt, null)
})

test('invalid totals fail instead of becoming false zero metrics', async () => {
  for (const total of [undefined, null, -1, 2.5, '100', Infinity]) {
    const api = createDashboardApi({ request: async () => ({ data: [], meta: { total } }) })
    await assert.rejects(api.count('SUBMITTED'), (error) => error.kind === 'invalid_response')
  }
})

test('malformed recent records and oversized pages are rejected', async () => {
  for (const rows of [[{ ...order, status: 'UNKNOWN' }], [{ ...order, created_at: 'not-a-date' }], [{ ...order, customer: null }], [{ ...order, id: '101' }], Array(6).fill(order)]) {
    const api = createDashboardApi({ request: async () => ({ data: rows, meta: { total: 10 } }) })
    await assert.rejects(api.recent(), (error) => error.kind === 'invalid_response')
  }
})
