import { createAuthStore } from '../../features/auth/auth-store'

export const authStore = createAuthStore({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  storage: () => window.sessionStorage,
})

export const api = authStore.api

export { ApiError } from './error'
export { createApiClient } from './client'
