import { normalizeApiBaseUrl } from './config'
import { ApiError, httpError } from './error'

type QueryValue = string | number | boolean | null | undefined

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
  /** Set false for public endpoints such as login and health. */
  auth?: boolean
}

export interface ApiClientOptions {
  baseUrl: string
  timeoutMs?: number
  getAccessToken?: () => string | null
  onUnauthorized?: (requestToken: string) => void
  fetch?: typeof globalThis.fetch
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = normalizeApiBaseUrl(options.baseUrl)
  const timeoutMs = options.timeoutMs ?? 15_000
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
    throw new ApiError('configuration', 'The API timeout must be a positive supported duration.')
  }
  const fetchRequest = options.fetch ?? globalThis.fetch.bind(globalThis)

  async function request<T>(path: string, requestOptions: ApiRequestOptions = {}): Promise<T> {
    // Keep bearer credentials within the configured API. Query values have their own encoder.
    if (!/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path)) {
      throw new ApiError('configuration', 'Use an API-relative endpoint such as /orders/1 with query options separately.')
    }
    const method = requestOptions.method ?? 'GET'
    if (method === 'GET' && requestOptions.body !== undefined) {
      throw new ApiError('configuration', 'GET requests must use query parameters instead of a body.')
    }
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(requestOptions.query ?? {})) {
      if (value !== null && value !== undefined) query.set(key, String(value))
    }
    const url = `${baseUrl}${path}${query.size ? `?${query}` : ''}`
    const headers = new Headers({ Accept: 'application/json' })
    let body: string | undefined
    let requestToken: string | null = null
    try {
      if (requestOptions.body !== undefined) {
        body = JSON.stringify(requestOptions.body)
        if (body === undefined) throw new Error('Not JSON')
        headers.set('Content-Type', 'application/json')
      }
      requestToken = requestOptions.auth === false ? null : options.getAccessToken?.() ?? null
      if (requestToken) headers.set('Authorization', `Bearer ${requestToken}`)
    } catch {
      throw new ApiError('configuration', 'The request body or authentication configuration is invalid.')
    }

    const controller = new AbortController()
    const cancel = () => controller.abort(new ApiError('cancelled', 'The request was cancelled.'))
    if (requestOptions.signal?.aborted) cancel()
    else requestOptions.signal?.addEventListener('abort', cancel, { once: true })
    const timer = setTimeout(() => controller.abort(new ApiError('timeout', 'The request timed out. Check the record before trying the action again.')), timeoutMs)
    let status: number | null = null
    try {
      controller.signal.throwIfAborted()
      const response = await fetchRequest(url, {
        method, headers, body, signal: controller.signal,
        credentials: 'omit', cache: 'no-store', redirect: 'error',
      })
      status = response.status
      if (status === 401 && requestToken) options.onUnauthorized?.(requestToken)
      if (response.status === 204) return undefined as T
      const text = await response.text()
      controller.signal.throwIfAborted()
      let payload: unknown
      let validJson = false
      if (/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(response.headers.get('Content-Type') ?? '')) {
        try {
          payload = JSON.parse(text)
          validJson = true
        } catch { /* HTTP failures still retain their status when the body is malformed. */ }
      }
      if (!response.ok) throw httpError(response.status, payload)
      if (!validJson) throw new ApiError('invalid_response', 'The server returned an unexpected response.', response.status)
      // Preserve data, links, meta, and message. Endpoint types are not runtime schema validation.
      return payload as T
    } catch (error) {
      if (controller.signal.aborted) throw controller.signal.reason
      if (error instanceof ApiError) throw error
      throw new ApiError('network', 'Could not reach the server. Check your connection and the record before retrying an action.', status)
    } finally {
      clearTimeout(timer)
      requestOptions.signal?.removeEventListener('abort', cancel)
    }
  }

  return { request }
}

export type ApiClient = ReturnType<typeof createApiClient>
