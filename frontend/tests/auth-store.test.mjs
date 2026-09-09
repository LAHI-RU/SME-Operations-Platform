import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { createServer } from 'vite'

let vite, createAuthStore
const baseUrl = 'https://api.example.test/api/v1'
const key = `sme.auth.token:${baseUrl}`
const account = { id: 8, name: 'Test Operator', email: 'operator@example.test', role: 'SALES' }
const credentials = { email: account.email, password: 'test-password' }
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const success = (data) => json({ success: true, message: 'OK', data })
const loginResponse = (token = 'test-token', user = account) => success({ user, token })
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }
function memoryStorage(initial = null) {
  const values = new Map(initial ? [[key, initial]] : [])
  return { getItem: (name) => values.get(name) ?? null, setItem: (name, value) => values.set(name, value), removeItem: (name) => values.delete(name) }
}
const store = (fetch, storage = memoryStorage()) => createAuthStore({ baseUrl, fetch, storage: () => storage })

before(async () => {
  vite = await createServer({ cacheDir: 'node_modules/.vite-test-auth', server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
  ;({ createAuthStore } = await vite.ssrLoadModule('/src/features/auth/auth-store.ts'))
})
after(async () => { await vite?.close() })

test('a fresh browser is anonymous without calling /me', async () => {
  const auth = store(() => { throw new Error('Unexpected fetch') })
  await auth.restore()
  assert.equal(auth.getSnapshot().status, 'anonymous')
})

test('login submits exact credentials, persists only token, and exposes actual user/role', async () => {
  const storage = memoryStorage()
  const auth = store(async (url, options) => {
    assert.equal(url, `${baseUrl}/auth/login`)
    assert.equal(options.method, 'POST')
    assert.deepEqual(JSON.parse(options.body), credentials)
    assert.equal(options.headers.get('Authorization'), null)
    return loginResponse()
  }, storage)
  await auth.login(credentials)
  assert.equal(storage.getItem(key), 'test-token')
  assert.deepEqual(auth.getSnapshot().user, account)
  assert.doesNotMatch(JSON.stringify(auth.getSnapshot()), /test-token|test-password/)
})

test('restored sessions validate /me before exposing user data and deduplicate StrictMode calls', async () => {
  const pending = deferred()
  let calls = 0
  const auth = store(async (url, options) => {
    calls += 1
    assert.equal(url, `${baseUrl}/auth/me`)
    assert.equal(options.headers.get('Authorization'), 'Bearer saved-token')
    return pending.promise
  }, memoryStorage('saved-token'))
  const first = auth.restore()
  const second = auth.restore()
  assert.equal(auth.getSnapshot().status, 'loading')
  assert.equal(auth.getSnapshot().user, null)
  pending.resolve(success(account))
  await Promise.all([first, second])
  assert.equal(calls, 1)
  assert.equal(auth.getSnapshot().status, 'authenticated')
})

test('expired restoration clears the saved token and becomes anonymous', async () => {
  const storage = memoryStorage('expired-token')
  const auth = store(async () => json({ message: 'Unauthenticated.' }, 401), storage)
  await auth.restore()
  assert.equal(storage.getItem(key), null)
  assert.equal(auth.getSnapshot().status, 'anonymous')
})

test('network restoration failures keep the token, hide private UI, and allow retry', async () => {
  const storage = memoryStorage('saved-token')
  let online = false
  const auth = store(async () => { if (!online) throw new TypeError('offline'); return success(account) }, storage)
  await auth.restore()
  assert.equal(auth.getSnapshot().status, 'unavailable')
  assert.equal(auth.getSnapshot().user, null)
  assert.equal(storage.getItem(key), 'saved-token')
  online = true
  await auth.restore()
  assert.equal(auth.getSnapshot().status, 'authenticated')
})

test('unknown roles or malformed account payloads never authenticate', async () => {
  for (const response of [
    () => loginResponse('token', { ...account, role: 'SUPER_ADMIN' }),
    () => loginResponse('token', { ...account, id: '8' }),
    () => loginResponse('', account),
    () => loginResponse('bad\ntoken', account),
    () => json({ success: false, data: { user: account, token: 'token' } }),
  ]) {
    const storage = memoryStorage()
    const auth = store(async () => response(), storage)
    await auth.restore()
    await assert.rejects(auth.login(credentials), (error) => error.kind === 'invalid_response')
    assert.equal(auth.getSnapshot().status, 'anonymous')
    assert.equal(storage.getItem(key), null)
  }
})

test('all four stored backend roles are accepted without role inference', async () => {
  for (const role of ['ADMIN', 'SALES', 'WAREHOUSE', 'DELIVERY']) {
    const auth = store(async () => loginResponse('token', { ...account, role }))
    await auth.login(credentials)
    assert.equal(auth.getSnapshot().user.role, role)
  }
})

test('duplicate login submissions create only one request', async () => {
  const pending = deferred()
  let calls = 0
  const auth = store(async () => { calls += 1; return pending.promise })
  const first = auth.login(credentials)
  const second = auth.login(credentials)
  pending.resolve(loginResponse())
  await Promise.all([first, second])
  assert.equal(calls, 1)
})

test('logout revokes current token before clearing local session and deduplicates clicks', async () => {
  const storage = memoryStorage('saved-token')
  const pending = deferred()
  let logoutCalls = 0
  const auth = store(async (url, options) => {
    if (url.endsWith('/me')) return success(account)
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.get('Authorization'), 'Bearer saved-token')
    logoutCalls += 1
    return pending.promise
  }, storage)
  await auth.restore()
  const first = auth.logout()
  const second = auth.logout()
  assert.equal(auth.getSnapshot().signingOut, true)
  assert.equal(storage.getItem(key), 'saved-token')
  pending.resolve(success(null))
  await Promise.all([first, second])
  assert.equal(logoutCalls, 1)
  assert.equal(auth.getSnapshot().status, 'anonymous')
  assert.equal(storage.getItem(key), null)
})

test('failed logout keeps session and exposes retry feedback; 401 logout clears it', async () => {
  let status = 503
  const auth = store(async (url) => url.endsWith('/me') ? success(account) : json({ message: 'Error' }, status), memoryStorage('saved-token'))
  await auth.restore()
  await auth.logout()
  assert.equal(auth.getSnapshot().status, 'authenticated')
  assert.ok(auth.getSnapshot().error)
  assert.equal(auth.getSnapshot().signingOut, false)
  status = 401
  await auth.logout()
  assert.equal(auth.getSnapshot().status, 'anonymous')
})

test('a protected API 401 clears current session, while 403 preserves it', async () => {
  let status = 403
  const auth = store(async (url) => url.endsWith('/login') ? loginResponse() : json({}, status))
  await auth.login(credentials)
  await assert.rejects(auth.api.request('/orders'))
  assert.equal(auth.getSnapshot().status, 'authenticated')
  status = 401
  await assert.rejects(auth.api.request('/orders'))
  assert.equal(auth.getSnapshot().status, 'anonymous')
})

test('an old request 401 cannot erase a newer login', async () => {
  const pending = deferred()
  let token = 'old-token'
  const auth = store(async (url) => url.endsWith('/login') ? loginResponse(token) : pending.promise)
  await auth.login(credentials)
  const oldRequest = auth.api.request('/orders')
  token = 'new-token'
  await auth.login(credentials)
  pending.resolve(json({}, 401))
  await assert.rejects(oldRequest)
  assert.equal(auth.getSnapshot().status, 'authenticated')
})

test('a stale /me response cannot resurrect a locally discarded session', async () => {
  const pending = deferred()
  const auth = store(async () => pending.promise, memoryStorage('saved-token'))
  const restoring = auth.restore()
  auth.forget()
  pending.resolve(success(account))
  await restoring
  assert.equal(auth.getSnapshot().status, 'anonymous')
})

test('a stale /me response cannot overwrite a newer account', async () => {
  const pending = deferred()
  const newer = { ...account, id: 20, name: 'New Account', role: 'ADMIN' }
  const auth = store(async (url) => url.endsWith('/me') ? pending.promise : loginResponse('new-token', newer), memoryStorage('saved-token'))
  const restoring = auth.restore()
  await auth.login(credentials)
  pending.resolve(success(account))
  await restoring
  assert.deepEqual(auth.getSnapshot().user, newer)
})

test('unavailable browser storage falls back to memory with visible notice', async () => {
  const auth = createAuthStore({ baseUrl, fetch: async () => loginResponse(), storage: () => { throw new Error('Storage blocked') } })
  await auth.restore()
  await auth.login(credentials)
  assert.equal(auth.getSnapshot().status, 'authenticated')
  assert.match(auth.getSnapshot().notice, /storage is unavailable/)
})
