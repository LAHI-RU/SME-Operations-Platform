import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode } from 'react'
import { createServer } from 'vite'

let server
let dom
let root
let App
let BrowserRouter
let scrollCalls = 0
const originalFetch = globalThis.fetch
let authStore
const account = { id: 8, name: 'Test Operator', email: 'operator@example.test', role: 'SALES' }
let loginStatus = 200
let loginCalls = 0
let logoutStatus = 200
let pendingLogin = null
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

before(async () => {
  dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  dom.window.scrollTo = () => { scrollCalls += 1 }
  globalThis.fetch = async (url) => {
    if (url.endsWith('/auth/login')) {
      loginCalls += 1
      if (pendingLogin) return pendingLogin.promise
      if (loginStatus === 422) return response({ errors: { email: ['The provided credentials are incorrect.'] } }, 422)
      if (loginStatus !== 200) throw new TypeError('offline')
      return response({ success: true, message: 'OK', data: { user: account, token: 'test-token' } })
    }
    if (url.endsWith('/auth/logout')) return response({ success: true, message: 'OK', data: null }, logoutStatus)
    return response({ success: true, message: 'OK', data: account })
  }
  // Transform the actual TypeScript components with the app's Vite configuration.
  // This is DOM simulation, not a visual browser or CSS layout test.
  server = await createServer({
    cacheDir: 'node_modules/.vite-test-navigation',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
  })
  App = (await server.ssrLoadModule('/src/App.tsx')).default
  ;({ authStore } = await server.ssrLoadModule('/src/lib/api/index.ts'))
  await authStore.login({ email: account.email, password: 'fixture-only' })
  BrowserRouter = (await import('react-router')).BrowserRouter
  const { createRoot } = await import('react-dom/client')
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(createElement(StrictMode, null, createElement(BrowserRouter, null, createElement(App)))))
})

after(async () => {
  if (root) await act(async () => root.unmount())
  await server?.close()
  dom?.window.close()
  delete globalThis.window
  delete globalThis.document
  delete globalThis.HTMLElement
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
  globalThis.fetch = originalFetch
})

async function visit(path) {
  await act(async () => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new window.PopStateEvent('popstate'))
  })
}

async function click(element) {
  assert.ok(element, 'Expected a clickable element')
  await act(async () => element.click())
}

test('the root redirects to dashboard and shows the authenticated account', () => {
  assert.equal(window.location.pathname, '/dashboard')
  assert.equal(document.title, 'Dashboard | SME Operations')
  assert.match(document.querySelector('main').textContent, /Live summaries will appear once/)
  const signOut = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Sign out'))
  assert.equal(signOut.disabled, false)
  assert.match(document.querySelector('header').textContent, /Test Operator/)
  assert.match(document.querySelector('header').textContent, /SALES/)
})

test('all permitted module deep links show the right heading, title, and active navigation', async () => {
  const modules = ['Orders', 'Delivery', 'Products', 'Categories', 'Inventory', 'Customers', 'Suppliers']
  for (const label of modules) {
    const path = `/${label.toLowerCase()}`
    await visit(path)
    assert.equal(document.querySelector('h1').textContent, label)
    assert.equal(document.title, `${label} | SME Operations`)
    assert.equal(document.querySelectorAll('main').length, 1)
    for (const navigation of document.querySelectorAll('nav')) {
      const active = navigation.querySelectorAll('[aria-current="page"]')
      assert.equal(active.length, 1)
      assert.equal(active[0].getAttribute('href'), path)
    }
    assert.match(document.querySelector('main').textContent, /navigation preview/)
  }
})

test('link navigation changes the URL, moves focus to main, and resets scroll', async () => {
  await visit('/dashboard')
  const previousScrollCalls = scrollCalls
  await click(document.querySelector('aside a[href="/orders"]'))
  assert.equal(window.location.pathname, '/orders')
  assert.equal(document.activeElement.id, 'main')
  assert.ok(scrollCalls > previousScrollCalls)
})

test('mobile menu toggles, closes on Escape, and restores focus to its control', async () => {
  const details = document.querySelector('details')
  const summary = details.querySelector('summary')
  await click(summary)
  assert.equal(details.open, true)
  details.querySelector('a').focus()
  await act(async () => {
    details.querySelector('a').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  assert.equal(details.open, false)
  assert.equal(document.activeElement, summary)
})

test('mobile menu closes on current-page and different-page links without leaving focus hidden', async () => {
  await visit('/orders')
  for (const path of ['/orders', '/inventory']) {
    const details = document.querySelector('details')
    await click(details.querySelector('summary'))
    assert.equal(details.open, true)
    const link = details.querySelector(`a[href="${path}"]`)
    link.focus()
    await click(link)
    assert.equal(window.location.pathname, path)
    assert.equal(document.querySelector('details').open, false)
    assert.equal(document.activeElement.id, 'main')
  }
})

test('history navigation updates the screen and closes an open mobile menu', async () => {
  await visit('/orders')
  await click(document.querySelector('aside a[href="/inventory"]'))
  await click(document.querySelector('summary'))
  await act(async () => {
    await new Promise((resolve) => {
      window.addEventListener('popstate', resolve, { once: true })
      window.history.back()
    })
  })
  assert.equal(document.querySelector('h1').textContent, 'Orders')
  assert.equal(document.querySelector('details').open, false)
})

test('trailing slashes and case variants keep route metadata consistent', async () => {
  await visit('/Orders/')
  assert.equal(document.querySelector('h1').textContent, 'Orders')
  assert.equal(document.title, 'Orders | SME Operations')
  assert.match(document.querySelector('summary').textContent, /Orders/)
})

test('design system has one main landmark and retains its validation interaction', async () => {
  await visit('/design-system')
  assert.equal(document.querySelectorAll('main').length, 1)
  assert.equal(document.querySelectorAll('header').length, 1)
  assert.equal(document.querySelectorAll('a[href="#main"]').length, 1)
  await click(document.querySelector('button[type="submit"]'))
  const input = document.querySelector('input[name="display_name"]')
  assert.equal(input.getAttribute('aria-invalid'), 'true')
  assert.equal(document.activeElement, input)
  assert.match(document.querySelector('[role="alert"]').textContent, /Enter a display name/)
})

test('unknown paths show a recoverable 404 without marking a module active', async () => {
  await visit('/orders/not-a-real-page')
  assert.equal(document.querySelector('h1').textContent, 'Page not found')
  assert.equal(document.querySelectorAll('nav [aria-current="page"]').length, 0)
  await click(document.querySelector('main a[href="/dashboard"]'))
  assert.equal(document.querySelector('h1').textContent, 'Dashboard')
})

test('successful logout protects the workspace and routes to login', async () => {
  await click([...document.querySelectorAll('button')].find((button) => button.textContent === 'Sign out'))
  assert.equal(window.location.pathname, '/login')
  assert.equal(document.querySelector('aside'), null)
  assert.equal(document.title, 'Sign in | SME Operations')
})

test('anonymous deep links go to login with validation, error focus, and no empty request', async () => {
  await visit('/inventory?page=2')
  assert.equal(window.location.pathname, '/login')
  const previousCalls = loginCalls
  await click(document.querySelector('button[type="submit"]'))
  assert.equal(loginCalls, previousCalls)
  assert.equal(document.activeElement.name, 'email')
  assert.match(document.body.textContent, /Enter your email address/)
})

async function fillLogin() {
  document.querySelector('input[name="email"]').value = account.email
  document.querySelector('input[name="password"]').value = 'fixture-password'
}

test('password visibility toggles and invalid credentials show Laravel field feedback', async () => {
  await fillLogin()
  await click([...document.querySelectorAll('button')].find((button) => button.textContent === 'Show password'))
  assert.equal(document.querySelector('input[name="password"]').type, 'text')
  loginStatus = 422
  await click(document.querySelector('button[type="submit"]'))
  assert.match(document.body.textContent, /The provided credentials are incorrect/)
  assert.equal(document.activeElement.name, 'email')
  assert.equal(document.querySelector('input[name="password"]').value, '')
  assert.equal(window.location.pathname, '/login')
})

test('network login failure shows recoverable feedback without opening protected pages', async () => {
  loginStatus = 503
  await fillLogin()
  await click(document.querySelector('button[type="submit"]'))
  assert.match(document.body.textContent, /Could not reach the server/)
  assert.equal(document.activeElement.getAttribute('role'), 'alert')
  assert.equal(document.querySelector('button[type="submit"]').disabled, false)
})

test('successful login returns to the original internal deep link', async () => {
  loginStatus = 200
  await fillLogin()
  await click(document.querySelector('button[type="submit"]'))
  assert.equal(window.location.pathname, '/inventory')
  assert.equal(window.location.search, '?page=2')
  assert.equal(document.querySelector('h1').textContent, 'Inventory')
})

test('failed logout stays authenticated with feedback and can be retried', async () => {
  logoutStatus = 503
  await click([...document.querySelectorAll('button')].find((button) => button.textContent === 'Sign out'))
  assert.equal(window.location.pathname, '/inventory')
  assert.match(document.querySelector('[role="alert"]').textContent, /Sign-out failed/)
  logoutStatus = 200
  await click([...document.querySelectorAll('button')].find((button) => button.textContent === 'Sign out'))
  assert.equal(window.location.pathname, '/login')
})

test('login blocks duplicate submissions and rejects an external return destination', async () => {
  await act(async () => {
    window.history.pushState({ usr: { from: '//external.example.test' } }, '', '/login')
    window.dispatchEvent(new window.PopStateEvent('popstate'))
  })
  let resolve
  pendingLogin = { promise: new Promise((done) => { resolve = done }) }
  await fillLogin()
  const calls = loginCalls
  await click(document.querySelector('button[type="submit"]'))
  assert.equal(document.querySelector('button[type="submit"]').disabled, true)
  assert.equal(document.querySelector('button[type="submit"]').getAttribute('aria-busy'), 'true')
  await click(document.querySelector('button[type="submit"]'))
  assert.equal(loginCalls, calls + 1)
  await act(async () => { resolve(response({ success: true, message: 'OK', data: { user: account, token: 'test-token' } })) })
  pendingLogin = null
  assert.equal(window.location.pathname, '/dashboard')
  assert.equal(window.location.origin, 'http://localhost')
})

const expectedActions = {
  ADMIN: {
    orders: ['Create orders', 'Submit orders', 'Confirm orders'], products: ['Create products', 'Update products', 'Delete products'],
    categories: ['Create categories', 'Update categories', 'Delete categories'], inventory: ['Stock in', 'Stock out'],
    customers: ['Create customers', 'Update customers', 'Delete customers'], suppliers: ['Create suppliers', 'Update suppliers', 'Delete suppliers'],
    delivery: ['Assign delivery', 'Start delivery', 'Complete delivery'],
  },
  SALES: { orders: ['Create orders', 'Submit orders'], products: [], categories: [], inventory: [], customers: ['Create customers', 'Update customers'], suppliers: [], delivery: ['Assign delivery'] },
  WAREHOUSE: { orders: ['Confirm orders'], products: ['Create products', 'Update products'], categories: [], inventory: ['Stock in', 'Stock out'], customers: [], suppliers: ['Create suppliers', 'Update suppliers'], delivery: [] },
  DELIVERY: { orders: [], products: [], categories: [], inventory: [], customers: [], suppliers: [], delivery: ['Start delivery', 'Complete delivery'] },
}

for (const role of ['ADMIN', 'SALES', 'WAREHOUSE', 'DELIVERY']) {
  test(`${role} sees matching desktop/mobile navigation, page access, and action previews`, async () => {
    account.role = role
    await act(async () => { await authStore.login({ email: account.email, password: 'fixture-only' }) })
    await visit('/dashboard')
    const hasFulfillment = ['ADMIN', 'WAREHOUSE'].includes(role)
    for (const navigation of document.querySelectorAll('nav')) assert.equal(Boolean(navigation.querySelector('a[href="/fulfillment"]')), hasFulfillment)
    assert.equal(Boolean(document.querySelector('main a[href="/fulfillment"]')), hasFulfillment)
    await visit('/fulfillment')
    assert.equal(document.querySelector('h1').textContent, hasFulfillment ? 'Fulfillment' : 'Access denied')
    assert.equal(document.title, `${hasFulfillment ? 'Fulfillment' : 'Access denied'} | SME Operations`)
    if (!hasFulfillment) {
      assert.equal(document.querySelector('#module-preview-heading'), null)
      await click(document.querySelector('main a[href="/dashboard"]'))
      assert.equal(document.querySelector('h1').textContent, 'Dashboard')
    } else {
      assert.deepEqual([...document.querySelectorAll('main li')].map((item) => item.textContent), ['Start fulfillment', 'Complete fulfillment'])
    }
    for (const [module, labels] of Object.entries(expectedActions[role])) {
      await visit(`/${module}`)
      assert.deepEqual([...document.querySelectorAll('main li')].map((item) => item.textContent), labels, `${role}: ${module}`)
      if (!labels.length) assert.match(document.querySelector('main').textContent, /Your role can view records/)
      assert.equal(document.querySelectorAll('main button').length, 0, 'Preview permissions must not pretend to execute operations')
    }
  })
}

test('losing a capability while on that route replaces its contents and updates navigation', async () => {
  account.role = 'WAREHOUSE'
  await act(async () => { await authStore.login({ email: account.email, password: 'fixture-only' }) })
  await visit('/fulfillment')
  account.role = 'SALES'
  await act(async () => { await authStore.login({ email: account.email, password: 'fixture-only' }) })
  assert.equal(document.querySelector('h1').textContent, 'Access denied')
  assert.equal(document.querySelectorAll('nav a[href="/fulfillment"]').length, 0)
  assert.equal(document.activeElement.id, 'main')
})
