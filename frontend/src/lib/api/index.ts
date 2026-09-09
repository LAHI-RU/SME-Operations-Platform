import { createApiClient } from './client'

// No persistence or session side effects. Authentication will supply a token reader.
export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
})

export { ApiError } from './error'
export { createApiClient } from './client'
