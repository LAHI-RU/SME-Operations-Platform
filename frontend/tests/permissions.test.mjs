import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { createServer } from 'vite'

let vite, can, visibleNavigationGroups
const roles = ['ADMIN', 'SALES', 'WAREHOUSE', 'DELIVERY']
// Expected policy behavior from backend/app/Policies, independent of the UI map.
const policyGroups = [
  { roles, capabilities: ['workspace.view', 'categories.view', 'products.view', 'customers.view', 'suppliers.view', 'inventory.view', 'inventory.transactions', 'orders.view', 'delivery.view'] },
  { roles: ['ADMIN'], capabilities: ['categories.create', 'categories.update', 'categories.delete', 'products.delete', 'customers.delete', 'suppliers.delete'] },
  { roles: ['ADMIN', 'SALES'], capabilities: ['customers.create', 'customers.update', 'orders.create', 'orders.submit', 'delivery.assign'] },
  { roles: ['ADMIN', 'WAREHOUSE'], capabilities: ['products.create', 'products.update', 'suppliers.create', 'suppliers.update', 'inventory.stockIn', 'inventory.stockOut', 'orders.confirm', 'fulfillment.start', 'fulfillment.complete'] },
  { roles: ['ADMIN', 'DELIVERY'], capabilities: ['delivery.start', 'delivery.complete'] },
]

before(async () => {
  vite = await createServer({ cacheDir: 'node_modules/.vite-test-permissions', server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
  ;({ can } = await vite.ssrLoadModule('/src/features/auth/permissions.ts'))
  ;({ visibleNavigationGroups } = await vite.ssrLoadModule('/src/lib/navigation.ts'))
})
after(async () => { await vite?.close() })

for (const role of roles) {
  test(`${role} capabilities match Laravel read and write policies`, () => {
    for (const group of policyGroups) {
      for (const capability of group.capabilities) {
        assert.equal(can({ role }, capability), group.roles.includes(role), `${role}: ${capability}`)
      }
    }
  })
}

test('missing/unknown roles and unknown capabilities fail closed', () => {
  for (const user of [null, undefined, {}, { role: 'admin' }, { role: 'SUPER_ADMIN' }]) {
    for (const group of policyGroups) for (const capability of group.capabilities) assert.equal(can(user, capability), false)
    assert.deepEqual(visibleNavigationGroups(user), [])
  }
  for (const capability of ['orders.cancel', 'orders.update', 'fulfillment.view', 'users.manage', 'toString', '__proto__']) {
    assert.equal(can({ role: 'ADMIN' }, capability), false)
  }
})

test('reading records remains available across roles while fulfillment entry follows its operation policy', () => {
  for (const role of roles) {
    const groups = visibleNavigationGroups({ role })
    assert.ok(groups.every((group) => group.items.length > 0))
    const paths = groups.flatMap((group) => group.items.map((item) => item.path))
    for (const path of ['/dashboard', '/orders', '/delivery', '/products', '/categories', '/inventory', '/customers', '/suppliers', '/design-system']) assert.ok(paths.includes(path), `${role}: ${path}`)
    assert.equal(paths.includes('/fulfillment'), ['ADMIN', 'WAREHOUSE'].includes(role))
  }
})
