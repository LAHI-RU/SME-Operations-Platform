import { createAuthStore } from '../../features/auth/auth-store'
import { queryClient } from '../query-client'

export const authStore = createAuthStore({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  storage: () => window.sessionStorage,
})

export const api = authStore.api

// Clear synchronously before a new session can render previously cached data.
let sessionVersion = authStore.getSnapshot().sessionVersion
const unsubscribe = authStore.subscribe(() => {
  const next = authStore.getSnapshot().sessionVersion
  if (next !== sessionVersion) {
    sessionVersion = next
    queryClient.clear()
  }
})
if (import.meta.hot) import.meta.hot.dispose(() => { unsubscribe(); queryClient.clear() })

export { ApiError } from './error'
export { createApiClient } from './client'
