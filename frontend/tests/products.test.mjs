import assert from 'node:assert/strict'
import { before, after, afterEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode } from 'react'
import { createServer } from 'vite'

let vite, dom, root, authStore, queryClient
const originalFetch = globalThis.fetch
const account = { id: 8, name: 'Catalog Operator', email: 'catalog@example.test', role: 'ADMIN' }
const product = { id: 1, sku: 'SKU-1', name: 'Test Product', description: 'Catalog description', cost_price: '0.00', selling_price: '12.50', reorder_level: 0, is_active: true, category: { id: 16, name: 'Later category' }, inventory: { quantity: 7 }, created_at: null, updated_at: null }
let saved = { ...product }, writeStatus = 200, deleteStatus = 200, listStatus = 200, listEmpty = false, pendingSave = null
const requests = []
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const page = (data, current = 1, total = 16) => ({ data, meta: { current_page: current, last_page: Math.max(1, Math.ceil(total / 15)), per_page: 15, total } })
before(async () => {
  dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/products' })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })
  dom.window.scrollTo = () => {}
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url, 'http://localhost'), path = parsed.pathname.replace('/api/v1', ''), method = options.method ?? 'GET'
    requests.push({ path, method, page: parsed.searchParams.get('page'), body: options.body && JSON.parse(options.body) })
    if (path === '/auth/login') return response({ success: true, message: 'OK', data: { user: account, token: 'catalog-test-token' } })
    if (path === '/auth/logout') return response({ success: true, message: 'OK', data: null })
    if (path === '/auth/me') return response({ success: true, message: 'OK', data: account })
    if (path === '/categories') {
      const current = Number(parsed.searchParams.get('page'))
      return response(page(current === 1 ? [{ id: 1, name: 'First category', is_active: true }] : [{ id: 16, name: 'Later category', is_active: false }], current))
    }
    if (method === 'POST' || method === 'PUT') {
      if (pendingSave) return new Promise((resolve) => { pendingSave.resolve = resolve })
      if (writeStatus === 422) return response({ errors: { sku: ['The sku has already been taken.'] } }, 422)
      if (writeStatus !== 200) return response({ message: 'Server Error' }, writeStatus)
      const body = JSON.parse(options.body)
      saved = { ...product, ...body, id: method === 'POST' ? 20 : 1, category: { id: body.category_id, name: 'Later category' }, cost_price: Number(body.cost_price).toFixed(2), selling_price: Number(body.selling_price).toFixed(2), inventory: { quantity: method === 'POST' ? 0 : 7 }, is_active: body.is_active ?? true }
      return response({ data: saved }, method === 'POST' ? 201 : 200)
    }
    if (method === 'DELETE') return response(deleteStatus === 200 ? { success: true, message: 'Deleted', data: null } : { message: 'Server Error' }, deleteStatus)
    if (path === '/products') {
      if (listStatus !== 200) return response({ message: 'Server Error' }, listStatus)
      const current = Number(parsed.searchParams.get('page'))
      return response(page(listEmpty || current > 2 ? [] : [current === 2 ? { ...product, id: 2, name: 'Second page product' } : product], current, listEmpty ? 0 : 16))
    }
    if (path === '/products/999') return response({ message: 'Not found' }, 404)
    if (path.startsWith('/products/')) return response({ data: path === '/products/20' ? saved : product })
    throw new Error(`Unexpected request: ${method} ${path}`)
  }
  vite = await createServer({ cacheDir: 'node_modules/.vite-test-products-ui', server: { middlewareMode: true, ws: false, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
  const App = (await vite.ssrLoadModule('/src/App.tsx')).default
  ;({ authStore } = await vite.ssrLoadModule('/src/lib/api/index.ts'))
  ;({ queryClient } = await vite.ssrLoadModule('/src/lib/query-client.ts'))
  queryClient.setDefaultOptions({ ...queryClient.getDefaultOptions(), queries: { ...queryClient.getDefaultOptions().queries, gcTime: Infinity } })
  await authStore.login({ email: account.email, password: 'fixture-only' })
  const { BrowserRouter } = await import('react-router'), { createRoot } = await import('react-dom/client')
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(createElement(StrictMode, null, createElement(BrowserRouter, null, createElement(App)))))
})
after(async () => {
  if (root) await act(async () => root.unmount())
  queryClient?.clear(); await vite?.close(); dom?.window.close()
  for (const key of ['window', 'document', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[key]
  globalThis.fetch = originalFetch
})
afterEach(async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 15)) }) })
async function waitFor(check) { for (let n = 0; n < 100; n++) { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)) }); try { check(); return } catch (error) { if (n === 99) throw error } } }
async function visit(path) { await act(async () => { window.history.pushState({}, '', path); window.dispatchEvent(new window.PopStateEvent('popstate')) }) }
const main = () => document.querySelector('main')
const button = (label) => [...document.querySelectorAll('main button')].find((item) => item.textContent === label)
async function click(element) { assert.ok(element, 'Clickable element exists'); await act(async () => element.click()) }
async function change(name, value) {
  const input = document.querySelector(`[name="${name}"]`)
  assert.ok(input, `Field ${name} exists`)
  await act(async () => {
    const prototype = input.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value)
    input.dispatchEvent(new window.Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
  })
}
async function fill() { for (const [name, value] of Object.entries({ name: 'New product', sku: 'NEW-20', category_id: '1', cost_price: '0', selling_price: '15.50', reorder_level: '0', description: 'Created in test' })) await change(name, value) }
const writes = () => requests.filter((request) => ['POST', 'PUT'].includes(request.method) && request.path.startsWith('/products'))

test('catalog uses totals and URL pagination, and keeps Products active on detail routes', async () => {
  await waitFor(() => assert.match(main().textContent, /16 products/))
  assert.match(main().textContent, /12.50/)
  await click(button('Next'))
  await waitFor(() => assert.match(main().textContent, /Second page product/))
  assert.equal(window.location.search, '?page=2')
  await click(button('Previous'))
  await waitFor(() => assert.match(main().textContent, /Test Product/))
  await click(document.querySelector('main a[aria-label="View SKU-1"]'))
  await waitFor(() => assert.match(main().textContent, /Stock on hand7/))
  assert.equal(document.querySelector('aside a[aria-current="page"]').getAttribute('href'), '/products')
  assert.equal(document.title, 'Product details | SME Operations')
})

test('invalid and missing product URLs recover with safe feedback', async () => {
  for (const path of ['/products/invalid', '/products/999']) {
    await visit(path)
    await waitFor(() => assert.ok(main().querySelector('[role="alert"]')))
    assert.ok(main().querySelector('a[href="/products"]'))
    assert.equal(main().querySelector('a[href$="/edit"]'), null)
  }
})

test('new product validation sends no request and focuses the first invalid field', async () => {
  await visit('/products/new')
  await waitFor(() => assert.equal(button('Create product').disabled, false))
  const count = writes().length
  await click(button('Create product'))
  assert.equal(writes().length, count)
  await waitFor(() => assert.equal(document.activeElement.name, 'name'))
  assert.match(main().textContent, /Enter a SKU/)
})

test('category selection loads subsequent pages and retains inactive existing categories', async () => {
  await click(button('Load more categories'))
  await waitFor(() => assert.ok(document.querySelector('option[value="16"]')))
  assert.match(document.querySelector('option[value="16"]').textContent, /inactive/)
  assert.ok(requests.some((request) => request.path === '/categories' && request.page === '2'))
})

test('server validation keeps form values and focuses the rejected SKU', async () => {
  await fill()
  writeStatus = 422
  await click(button('Create product'))
  assert.equal(window.location.pathname, '/products/new')
  assert.match(main().textContent, /sku has already been taken/)
  assert.equal(document.querySelector('[name="name"]').value, 'New product')
  await waitFor(() => assert.equal(document.activeElement.name, 'sku'))
  writeStatus = 200
})

test('create accepts zero cost, blocks duplicate submissions, and opens the saved resource', async () => {
  pendingSave = {}
  const count = writes().length
  await click(button('Create product'))
  assert.equal(button('Create product').disabled, true)
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(writes().length, count + 1)
  assert.equal(button('Create product').disabled, true)
  const request = writes().at(-1)
  assert.equal(request.body.cost_price, '0')
  assert.equal(request.body.is_active, undefined)
  saved = { ...product, id: 20, name: 'New product', inventory: { quantity: 0 } }
  await act(async () => pendingSave.resolve(response({ data: saved }, 201)))
  pendingSave = null
  await waitFor(() => assert.equal(window.location.pathname, '/products/20'))
  assert.match(main().textContent, /Product saved/)
  assert.match(main().textContent, /Stock on hand0/)
})

test('edit loads nested category and prices, supports inactive state, and sends full fields', async () => {
  await visit('/products/1/edit')
  await waitFor(() => assert.equal(button('Save changes')?.disabled, false))
  assert.equal(document.querySelector('[name="category_id"]').value, '16')
  assert.equal(document.querySelector('[name="selling_price"]').value, '12.50')
  await change('name', 'Updated product')
  await click(document.querySelector('[name="is_active"]'))
  await click(button('Save changes'))
  await waitFor(() => assert.equal(window.location.pathname, '/products/1'))
  const request = writes().at(-1)
  assert.equal(request.method, 'PUT')
  assert.equal(request.body.name, 'Updated product')
  assert.equal(request.body.category_id, 16)
  assert.equal(request.body.is_active, false)
  assert.match(main().textContent, /Inactive/)
})

test('delete requires confirmation, cancellation sends nothing, and server failure remains retryable', async () => {
  const count = requests.filter((request) => request.method === 'DELETE').length
  await click(button('Delete product'))
  assert.equal(document.activeElement, button('Keep product'))
  await click(button('Keep product'))
  assert.equal(requests.filter((request) => request.method === 'DELETE').length, count)
  await click(button('Delete product'))
  deleteStatus = 500
  await click(button('Confirm deletion'))
  assert.ok(main().querySelector('[role="alert"]'))
  assert.equal(window.location.pathname, '/products/1')
  deleteStatus = 200
  await click(button('Confirm deletion'))
  await waitFor(() => assert.equal(window.location.pathname, '/products'))
  assert.match(main().textContent, /Product deleted/)
})

test('all roles can read products while only permitted roles can create, edit, or delete', async () => {
  for (const role of ['ADMIN', 'WAREHOUSE', 'SALES', 'DELIVERY']) {
    account.role = role
    await act(async () => authStore.login({ email: account.email, password: 'fixture-only' }))
    const edit = ['ADMIN', 'WAREHOUSE'].includes(role)
    await visit('/products')
    await waitFor(() => assert.match(main().textContent, /16 products/))
    assert.equal(Boolean(main().querySelector('a[href="/products/new"]')), edit)
    await visit('/products/1')
    await waitFor(() => assert.match(main().textContent, /Product details/))
    assert.equal(Boolean(main().querySelector('a[href="/products/1/edit"]')), edit)
    assert.equal(Boolean(button('Delete product')), role === 'ADMIN')
    for (const path of ['/products/new', '/products/1/edit']) {
      await visit(path)
      await waitFor(() => assert.equal(document.querySelector('h1')?.textContent, edit ? path.endsWith('/new') ? 'New product' : 'Edit product' : 'Access denied'))
    }
  }
})

test('list failures retry without fabricated empty results and out-of-range pages can recover', async () => {
  listStatus = 503
  await visit('/products?page=3')
  await waitFor(() => assert.ok(button('Try again')))
  assert.doesNotMatch(main().textContent, /No products yet/)
  listStatus = 200
  await click(button('Try again'))
  await waitFor(() => assert.match(main().textContent, /No products on this page/))
  await click(button('Previous'))
  await waitFor(() => assert.equal(window.location.search, '?page=2'))
  listEmpty = true
  await visit('/products?page=1')
  await waitFor(() => assert.ok(button('Refresh products')))
  await click(button('Refresh products'))
  await waitFor(() => assert.match(main().textContent, /No products yet/))
  listEmpty = false
})

test('a late write from a previous session cannot populate the new session cache or navigate', async () => {
  account.role = 'ADMIN'
  await act(async () => authStore.login({ email: account.email, password: 'fixture-only' }))
  await visit('/products/new')
  await waitFor(() => assert.equal(button('Create product').disabled, false))
  await fill()
  pendingSave = {}
  await click(button('Create product'))
  await act(async () => authStore.logout())
  assert.equal(window.location.pathname, '/login')
  await act(async () => pendingSave.resolve(response({ data: { ...product, id: 55 } }, 201)))
  pendingSave = null
  assert.equal(queryClient.getQueryData(['products', 'detail', 55]), undefined)
  assert.equal(window.location.pathname, '/login')
})
