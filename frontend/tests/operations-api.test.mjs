import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { createServer } from 'vite'
let vite, createOperationsApi, directoryPayload, previewTotal, workflowActions, can
const common = { id: 1, name: 'Example', is_active: true, created_at: null, updated_at: null }
const category = { ...common, description: null }
const customer = { ...common, customer_code: 'CUS-1', phone: '555', email: null, address: null }
const order = {
  id: 1,
  order_number: 'SO-1',
  status: 'DRAFT',
  customer: { id: 1, customer_code: 'CUS-1', name: 'Example' },
  items: [
    {
      id: 1,
      product_id: 2,
      sku: null,
      product_name: null,
      quantity: 2,
      unit_price: '0.10',
      subtotal: '0.20',
    },
  ],
  total_amount: '0.20',
  notes: null,
  order_date: null,
  created_at: null,
  updated_at: null,
}
const inventory = {
  id: 1,
  product_id: 2,
  quantity: 20,
  product: { id: 2, sku: 'SKU', name: 'Product' },
  updated_at: null,
}
const meta = { current_page: 2, last_page: 3, per_page: 15, total: 40 }
before(async () => {
  vite = await createServer({
    cacheDir: 'node_modules/.vite-test-operations',
    server: { middlewareMode: true, ws: false, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
  })
  ;({ createOperationsApi } = await vite.ssrLoadModule('/src/features/operations/api.ts'))
  ;({ directoryPayload } = await vite.ssrLoadModule('/src/features/directory/config.ts'))
  ;({ previewTotal } = await vite.ssrLoadModule('/src/features/operations/helpers.ts'))
  ;({ workflowActions } = await vite.ssrLoadModule('/src/features/orders/workflow.ts'))
  ;({ can } = await vite.ssrLoadModule('/src/features/auth/permissions.ts'))
})
after(async () => {
  await vite?.close()
})

test('directory fields exclude server-owned codes and creation active state', () => {
  assert.deepEqual(
    directoryPayload(
      'customers',
      { name: ' Example ', phone: '555', email: '', address: ' ', customer_code: 'FAKE', is_active: false },
      false,
    ),
    { name: 'Example', phone: '555', email: null, address: null },
  )
  assert.deepEqual(
    directoryPayload('categories', { name: 'Desk', description: '', is_active: false }, true),
    { name: 'Desk', description: null, is_active: false },
  )
})
test('directory reads decode paginator metadata and preserve cancellation', async () => {
  const signal = new AbortController().signal
  const client = createOperationsApi({
    request: async (path, options) => {
      assert.equal(path, '/customers')
      assert.deepEqual(options.query, { page: 2 })
      assert.equal(options.signal, signal)
      return { data: [customer], meta }
    },
  })
  assert.equal((await client.directoryList('customers', 2, signal)).meta.total, 40)
})
test('directory updates use full PUT and deletion verifies success envelope', async () => {
  const client = createOperationsApi({
    request: async (path, options) => {
      assert.equal(path, '/categories/1')
      if (options.method === 'DELETE') return { success: true, message: 'Deleted', data: null }
      assert.equal(options.method, 'PUT')
      assert.equal(options.body.name, 'Example')
      return { data: category }
    },
  })
  assert.equal((await client.directorySave('categories', { name: 'Example' }, 1)).id, 1)
  await client.directoryDelete('categories', 1)
  await assert.rejects(
    createOperationsApi({ request: async () => ({ success: false }) }).directoryDelete('categories', 1),
    (error) => error.kind === 'invalid_response',
  )
})
test('stock-out sends positive quantities and the ledger accepts signed outgoing movements', async () => {
  const client = createOperationsApi({
    request: async (path, options) => {
      if (path.endsWith('transactions'))
        return {
          data: [
            {
              id: 1,
              product_id: 2,
              type: 'ADJUSTMENT_OUT',
              quantity: -3,
              reference_type: null,
              reference_id: null,
              notes: null,
              created_by: null,
              created_at: null,
            },
          ],
          meta,
        }
      assert.equal(path, '/inventory/2/stock-out')
      assert.equal(options.method, 'POST')
      assert.equal(options.body.quantity, 3)
      return { data: inventory }
    },
  })
  assert.equal(
    (await client.stock(2, 'out', { type: 'ADJUSTMENT_OUT', quantity: 3, notes: null })).quantity,
    20,
  )
  assert.equal((await client.transactions(2, 2)).data[0].quantity, -3)
})
test('order filters and page are sent together without following untrusted paginator links', async () => {
  const query = { page: 2, status: 'SUBMITTED', search: 'North & South', customer_id: 1, per_page: 15 }
  const client = createOperationsApi({
    request: async (path, options) => {
      assert.equal(path, '/orders')
      assert.deepEqual(options.query, query)
      return { data: [order], meta }
    },
  })
  assert.equal((await client.orders(query)).data[0].total_amount, '0.20')
})
test('draft creation sends customer/items/notes, while backend prices remain authoritative', async () => {
  const body = { customer_id: 1, items: [{ product_id: 2, quantity: 2 }], notes: null }
  const client = createOperationsApi({
    request: async (path, options) => {
      assert.equal(path, '/orders')
      assert.equal(options.method, 'POST')
      assert.deepEqual(options.body, body)
      return { data: order }
    },
  })
  assert.equal((await client.createOrder(body)).items[0].unit_price, '0.10')
})
test('order actions preserve pending-stock success and decode fulfillment/delivery envelopes', async () => {
  const client = createOperationsApi({
    request: async (path, options) => {
      assert.equal(options.method, 'POST')
      if (path.endsWith('/confirm')) {
        assert.equal(options.body, undefined)
        return { data: { ...order, status: 'PENDING_STOCK' } }
      }
      if (path.endsWith('/fulfillment/complete')) {
        assert.deepEqual(options.body, { notes: 'Packed' })
        return {
          data: {
            id: 1,
            sales_order_id: 1,
            status: 'COMPLETED',
            started_at: null,
            completed_at: null,
            packed_by: 1,
            notes: 'Packed',
          },
        }
      }
      assert.deepEqual(options.body, { assigned_to: 4 })
      return {
        data: {
          id: 1,
          sales_order_id: 1,
          status: 'ASSIGNED',
          assigned_to: 4,
          assigned_at: null,
          out_for_delivery_at: null,
          delivered_at: null,
          notes: null,
        },
      }
    },
  })
  assert.equal((await client.action(1, 'confirm')).status, 'PENDING_STOCK')
  assert.equal((await client.action(1, 'fulfillment/complete', { notes: 'Packed' })).status, 'COMPLETED')
  assert.equal((await client.action(1, 'delivery/assign', { assigned_to: 4 })).assigned_to, 4)
})
test('malformed order money, statuses, and relations fail without rendering invented data', async () => {
  for (const value of [
    { ...order, total_amount: 0.2 },
    { ...order, status: 'UNKNOWN' },
    { ...order, customer: null },
    { ...order, items: null },
  ])
    await assert.rejects(
      createOperationsApi({ request: async () => ({ data: value }) }).order(1),
      (error) => error.kind === 'invalid_response',
    )
})
test('estimate arithmetic is exact even for large prices and decimal fractions', () => {
  assert.equal(
    previewTotal([
      { price: '0.10', quantity: 3 },
      { price: '0.20', quantity: 1 },
    ]),
    '0.50',
  )
  assert.equal(previewTotal([{ price: '9999999999.99', quantity: 999999 }]), '9999989999990000.01')
  assert.equal(
    previewTotal([
      { price: '0.10', quantity: -1 },
      { price: '0.20', quantity: NaN },
    ]),
    '0.00',
  )
})
test('workflow offers only existing transitions and respects every role capability', () => {
  assert.equal(workflowActions.PENDING_STOCK, undefined)
  assert.equal(workflowActions.CANCELLED, undefined)
  assert.equal(workflowActions.DELIVERED, undefined)
  const expected = {
    DRAFT: ['ADMIN', 'SALES'],
    SUBMITTED: ['ADMIN', 'WAREHOUSE'],
    CONFIRMED: ['ADMIN', 'WAREHOUSE'],
    PACKING: ['ADMIN', 'WAREHOUSE'],
    READY_FOR_DELIVERY: ['ADMIN', 'SALES'],
    ASSIGNED: ['ADMIN', 'DELIVERY'],
    OUT_FOR_DELIVERY: ['ADMIN', 'DELIVERY'],
  }
  for (const [status, roles] of Object.entries(expected))
    for (const role of ['ADMIN', 'SALES', 'WAREHOUSE', 'DELIVERY'])
      assert.equal(
        can({ role }, workflowActions[status].capability),
        roles.includes(role),
        `${status}/${role}`,
      )
})
