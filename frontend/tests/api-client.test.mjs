import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'

let vite
let createApiClient
let ApiError
let normalizeApiBaseUrl
const baseUrl = 'https://api.example.test/api/v1'
const json = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
const fixture = (fetch, options = {}) => createApiClient({ baseUrl, fetch, ...options })

before(async () => {
  vite = await createServer({ cacheDir: 'node_modules/.vite-test-api', server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
  ;({ createApiClient } = await vite.ssrLoadModule('/src/lib/api/client.ts'))
  ;({ ApiError } = await vite.ssrLoadModule('/src/lib/api/error.ts'))
  ;({ normalizeApiBaseUrl } = await vite.ssrLoadModule('/src/lib/api/config.ts'))
})

after(async () => { await vite?.close() })

function rejectsAs(promise, kind, status = null) {
  return assert.rejects(promise, (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.kind, kind)
    assert.equal(error.status, status)
    return true
  })
}

test('base URL supports local, hosted, and same-origin API paths', () => {
  assert.equal(normalizeApiBaseUrl(' http://127.0.0.1:8000/api/v1/ '), 'http://127.0.0.1:8000/api/v1')
  assert.equal(normalizeApiBaseUrl('/api/v1/'), '/api/v1')
  assert.equal(normalizeApiBaseUrl('https://example.test/backend/api/v1'), 'https://example.test/backend/api/v1')
})

test('invalid configuration is rejected before any request', () => {
  for (const value of ['', 'api/v1', '//other.test/api/v1', 'ftp://other.test/api/v1', 'https://user:pass@other.test/api/v1', 'https://other.test', '/api/v1?token=secret', '/api/v1#fragment']) {
    assert.throws(() => normalizeApiBaseUrl(value), (error) => error.kind === 'configuration')
  }
  for (const timeoutMs of [0, -1, Infinity, NaN, 2_147_483_648]) {
    assert.throws(() => fixture(() => json({}), { timeoutMs }), (error) => error.kind === 'configuration')
  }
})

test('GET encodes filters while preserving false/zero and omitting null/undefined', async () => {
  const client = fixture(async (url, options) => {
    const parsed = new URL(url)
    assert.equal(parsed.pathname, '/api/v1/orders')
    assert.equal(parsed.searchParams.get('search'), 'A&B / + ?')
    assert.equal(parsed.searchParams.get('page'), '2')
    assert.equal(parsed.searchParams.get('active'), 'false')
    assert.equal(parsed.searchParams.get('zero'), '0')
    assert.equal(parsed.searchParams.has('status'), false)
    assert.equal(parsed.searchParams.has('missing'), false)
    assert.equal(options.headers.get('Accept'), 'application/json')
    assert.equal(options.headers.has('Content-Type'), false)
    assert.equal(options.body, undefined)
    assert.equal(options.credentials, 'omit')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.redirect, 'error')
    return json({ data: [] })
  })
  await client.request('/orders', { query: { search: 'A&B / + ?', page: 2, active: false, zero: 0, status: null, missing: undefined } })
})

test('each request uses the current token and public calls omit authentication', async () => {
  let token = 'first-test-token'
  const observed = []
  const client = fixture(async (_url, options) => {
    observed.push(options.headers.get('Authorization'))
    return json({ data: null })
  }, { getAccessToken: () => token })
  await client.request('/auth/me')
  token = 'second-test-token'
  await client.request('/auth/me')
  await client.request('/health', { auth: false })
  token = null
  await client.request('/auth/me')
  assert.deepEqual(observed, ['Bearer first-test-token', 'Bearer second-test-token', null, null])
})

test('writes serialize JSON and bodyless workflow actions do not manufacture a payload', async () => {
  const calls = []
  const client = fixture(async (_url, options) => { calls.push(options); return json({ data: null }, 201) })
  await client.request('/orders', { method: 'POST', body: { customer_id: 1, items: [{ product_id: 2, quantity: 3 }] } })
  await client.request('/orders/1/submit', { method: 'POST' })
  await client.request('/customers/1', { method: 'PATCH', body: { name: 'A', phone: '123', is_active: false } })
  await client.request('/suppliers/1', { method: 'DELETE' })
  assert.deepEqual(JSON.parse(calls[0].body), { customer_id: 1, items: [{ product_id: 2, quantity: 3 }] })
  assert.equal(calls[0].headers.get('Content-Type'), 'application/json')
  assert.equal(calls[1].body, undefined)
  assert.equal(calls[1].headers.has('Content-Type'), false)
  assert.equal(calls[2].method, 'PATCH')
  assert.equal(calls[3].method, 'DELETE')
})

test('invalid endpoints cannot bypass the API base or receive credentials', async () => {
  let calls = 0
  const client = fixture(async () => { calls += 1; return json({}) })
  for (const path of ['https://other.test/orders', '//other.test/orders', '/../health', '/%2e%2e/health', '/orders?search=A', '/orders#token', '/orders\\other']) {
    await rejectsAs(client.request(path), 'configuration')
  }
  await rejectsAs(client.request('/orders', { body: {} }), 'configuration')
  await rejectsAs(client.request('/orders', { method: 'POST', body: 1n }), 'configuration')
  assert.equal(calls, 0)
})

test('resource, message, pending-stock, and pagination envelopes are returned intact', async () => {
  const envelopes = [
    { data: { id: 1, selling_price: '10.50' } },
    { success: true, message: 'Logout successful.', data: null },
    { data: { id: 1, status: 'PENDING_STOCK' } },
    { data: [{ id: 1 }], links: { first: '/orders?page=1', last: '/orders?page=3', prev: null, next: '/orders?page=2' }, meta: { current_page: 1, from: 1, last_page: 3, links: [], path: '/orders', per_page: 15, to: 15, total: 33 } },
  ]
  for (const envelope of envelopes) assert.deepEqual(await fixture(async () => json(envelope)).request('/orders'), envelope)
})

test('204 returns undefined for callers requesting void', async () => {
  assert.equal(await fixture(async () => new Response(null, { status: 204 })).request('/customers/1', { method: 'DELETE' }), undefined)
})

test('422 preserves dotted field errors and rejects malformed message entries', async () => {
  const client = fixture(async () => json({
    message: 'Raw message is not copied', exception: 'debug detail',
    errors: { 'items.0.quantity': ['The quantity must be at least 1.', 42, ''], email: ['The provided credentials are incorrect.'], invalid: 'not-an-array' },
  }, 422))
  await assert.rejects(client.request('/orders'), (error) => {
    assert.equal(error.kind, 'validation')
    assert.deepEqual(error.fieldErrors, { 'items.0.quantity': ['The quantity must be at least 1.'], email: ['The provided credentials are incorrect.'] })
    assert.doesNotMatch(JSON.stringify(error), /debug detail|Raw message/)
    return true
  })
})

test('409 exposes only the known safe business envelope message', async () => {
  await assert.rejects(fixture(async () => json({ success: false, message: 'Only draft orders can be submitted.' }, 409)).request('/orders/1/submit', { method: 'POST' }), (error) => {
    assert.equal(error.kind, 'conflict')
    assert.equal(error.message, 'Only draft orders can be submitted.')
    return true
  })
  await assert.rejects(fixture(async () => json({ message: 'unsafe debug text' }, 409)).request('/orders'), (error) => !error.message.includes('unsafe'))
})

for (const [status, kind] of [[401, 'unauthenticated'], [403, 'forbidden'], [404, 'not_found'], [429, 'rate_limited'], [500, 'server'], [503, 'server'], [400, 'http']]) {
  test(`${status} maps to ${kind} without exposing backend diagnostics`, async () => {
    const client = fixture(async () => json({ message: 'SQL password secret', exception: 'trace' }, status))
    await assert.rejects(client.request('/orders'), (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.kind, kind)
      assert.equal(error.status, status)
      assert.doesNotMatch(error.message + JSON.stringify(error), /SQL|password|secret|trace/)
      return true
    })
  })
}

test('HTML and malformed JSON success bodies are invalid responses', async () => {
  for (const [body, contentType] of [['<html>Vite fallback</html>', 'text/html'], ['{bad-json', 'application/json'], ['', 'application/json']]) {
    await rejectsAs(fixture(async () => new Response(body, { headers: { 'Content-Type': contentType } })).request('/health'), 'invalid_response', 200)
  }
})

test('HTTP error status survives a non-JSON body', async () => {
  await rejectsAs(fixture(async () => new Response('<html>proxy error</html>', { status: 502 })).request('/health'), 'server', 502)
  await rejectsAs(fixture(async () => new Response('{bad-json', { status: 401, headers: { 'Content-Type': 'application/json' } })).request('/health'), 'unauthenticated', 401)
})

test('network failures are normalized and mutations are never automatically retried', async () => {
  let calls = 0
  const client = fixture(async () => { calls += 1; throw new TypeError('fetch failed with private diagnostic') })
  await rejectsAs(client.request('/orders', { method: 'POST', body: {} }), 'network')
  assert.equal(calls, 1)
})

const pendingFetch = (_url, { signal }) => new Promise((_resolve, reject) => {
  signal.addEventListener('abort', () => reject(signal.reason), { once: true })
})

test('a caller can cancel an in-flight request', async () => {
  const controller = new AbortController()
  const pending = fixture(pendingFetch).request('/orders', { signal: controller.signal })
  controller.abort('caller reason is not exposed')
  await rejectsAs(pending, 'cancelled')
})

test('pre-cancelled requests do not reach the network', async () => {
  let calls = 0
  const controller = new AbortController()
  controller.abort()
  await rejectsAs(fixture(async () => { calls += 1; return json({}) }).request('/orders', { signal: controller.signal }), 'cancelled')
  assert.equal(calls, 0)
})

test('timeouts abort in-flight requests and remain distinct from cancellation', async () => {
  await rejectsAs(fixture(pendingFetch, { timeoutMs: 10 }).request('/orders'), 'timeout')
})

test('timeout also covers reading the response body after headers arrive', async () => {
  const client = fixture(async (_url, { signal }) => ({
    status: 200,
    text: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })),
  }), { timeoutMs: 10 })
  await rejectsAs(client.request('/orders'), 'timeout')
})

test('completed requests remove the caller abort listener', async () => {
  const controller = new AbortController()
  let removed = 0
  const remove = controller.signal.removeEventListener.bind(controller.signal)
  controller.signal.removeEventListener = (...args) => { removed += 1; remove(...args) }
  await fixture(async () => json({ data: [] })).request('/orders', { signal: controller.signal })
  assert.equal(removed, 1)
})

test('the real fetch transport works against a local HTTP server and blocks redirects', async () => {
  let destinationCalls = 0
  const server = createHttpServer((request, response) => {
    if (request.url === '/api/v1/redirect') {
      response.writeHead(302, { Location: '/api/v1/destination' }).end()
    } else {
      if (request.url === '/api/v1/destination') destinationCalls += 1
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ data: { url: request.url, accept: request.headers.accept } }))
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const client = createApiClient({ baseUrl: `http://127.0.0.1:${server.address().port}/api/v1` })
    assert.deepEqual(await client.request('/orders', { query: { page: 2 } }), { data: { url: '/api/v1/orders?page=2', accept: 'application/json' } })
    await rejectsAs(client.request('/redirect'), 'network')
    assert.equal(destinationCalls, 0)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
