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

before(async () => {
  dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  dom.window.scrollTo = () => { scrollCalls += 1 }
  // Transform the actual TypeScript components with the app's Vite configuration.
  // This is DOM simulation, not a visual browser or CSS layout test.
  server = await createServer({
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
  })
  App = (await server.ssrLoadModule('/src/App.tsx')).default
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

test('the root redirects to dashboard and keeps account actions unavailable', () => {
  assert.equal(window.location.pathname, '/dashboard')
  assert.equal(document.title, 'Dashboard | SME Operations')
  assert.match(document.querySelector('main').textContent, /Live summaries will appear once/)
  const signOut = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Sign out'))
  assert.equal(signOut.disabled, true)
  assert.match(document.getElementById(signOut.getAttribute('aria-describedby')).textContent, /not connected yet/)
})

test('all module deep links show the right heading, title, and active navigation', async () => {
  const modules = ['Orders', 'Fulfillment', 'Delivery', 'Products', 'Categories', 'Inventory', 'Customers', 'Suppliers']
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
