import { createApiClient, type ApiClientOptions } from '../../lib/api/client'
import { ApiError } from '../../lib/api/error'
import { createAuthApi, type AuthUser, type LoginCredentials } from './auth-api'

export interface AuthState {
  status: 'loading' | 'anonymous' | 'authenticated' | 'unavailable'
  user: AuthUser | null
  error: string | null
  notice: string | null
  signingOut: boolean
}

type Options = Pick<ApiClientOptions, 'baseUrl' | 'fetch' | 'timeoutMs'> & {
  storage: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

export function createAuthStore(options: Options) {
  const storageKey = `sme.auth.token:${options.baseUrl.replace(/\/+$/, '')}`
  let token: string | null = null
  let state: AuthState = { status: 'loading', user: null, error: null, notice: null, signingOut: false }
  let revision = 0
  let initialized = false
  let restoring: Promise<void> | null = null
  let loggingIn: Promise<void> | null = null
  let loggingOut: Promise<void> | null = null
  const listeners = new Set<() => void>()
  const publish = (next: Partial<AuthState>) => {
    state = { ...state, ...next }
    listeners.forEach((listener) => listener())
  }
  const persist = () => {
    try {
      const storage = options.storage()
      if (token) storage.setItem(storageKey, token)
      else storage.removeItem(storageKey)
    } catch {
      publish({ notice: 'Browser storage is unavailable. Your login may not survive a refresh.' })
    }
  }
  const clear = (notice: string | null = null) => {
    revision += 1
    initialized = true
    token = null
    publish({ status: 'anonymous', user: null, error: null, notice, signingOut: false })
    persist()
  }
  const api = createApiClient({
    baseUrl: options.baseUrl, fetch: options.fetch, timeoutMs: options.timeoutMs,
    getAccessToken: () => token,
    onUnauthorized: (requestToken) => {
      // An old request must never clear a newer session.
      if (token === requestToken) clear('Your session has ended. Please sign in again.')
    },
  })
  const authApi = createAuthApi(api)

  function restore(): Promise<void> {
    if (restoring) return restoring
    if (initialized && state.status !== 'unavailable') return Promise.resolve()
    if (!initialized) {
      try { token = options.storage().getItem(storageKey) || null }
      catch { publish({ notice: 'Browser storage is unavailable. Sign in to continue.' }) }
      initialized = true
    }
    if (!token) {
      publish({ status: 'anonymous', user: null })
      return Promise.resolve()
    }
    const attempt = ++revision
    publish({ status: 'loading', error: null, user: null })
    restoring = (async () => {
      try {
        const account = await authApi.me()
        if (revision === attempt) publish({ status: 'authenticated', user: account })
      } catch (error) {
        if (revision === attempt) publish({ status: 'unavailable', error: error instanceof ApiError ? error.message : 'Could not verify your session.' })
      } finally { restoring = null }
    })()
    return restoring
  }

  function login(credentials: LoginCredentials): Promise<void> {
    if (loggingIn) return loggingIn
    if (loggingOut) return Promise.reject(new ApiError('conflict', 'Please wait for sign-out to finish.'))
    const attempt = ++revision
    loggingIn = (async () => {
      const result = await authApi.login(credentials)
      if (revision !== attempt) throw new ApiError('cancelled', 'This sign-in attempt is no longer active.')
      token = result.token
      initialized = true
      publish({ status: 'authenticated', user: result.user, error: null, notice: null })
      persist()
    })().finally(() => { loggingIn = null })
    return loggingIn
  }

  function logout(): Promise<void> {
    if (loggingOut) return loggingOut
    if (!token) { clear(); return Promise.resolve() }
    const attempt = ++revision
    publish({ signingOut: true, error: null })
    loggingOut = (async () => {
      try {
        await authApi.logout()
        if (revision === attempt) clear()
      } catch (error) {
        // A 401 has already cleared this session through the shared client.
        if (revision === attempt) publish({ error: error instanceof ApiError ? error.message : 'Could not sign out. Please try again.' })
      } finally {
        if (revision === attempt) publish({ signingOut: false })
        loggingOut = null
      }
    })()
    return loggingOut
  }

  return {
    api, restore, login, logout,
    forget: () => clear('Signed out on this device. The server token has not been revoked.'),
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}
