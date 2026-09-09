import type { ApiClient } from '../../lib/api/client'
import { ApiError } from '../../lib/api/error'

export const USER_ROLES = ['ADMIN', 'SALES', 'WAREHOUSE', 'DELIVERY'] as const
export type UserRole = typeof USER_ROLES[number]
export interface AuthUser { id: number; name: string; email: string; role: UserRole }
export interface LoginCredentials { email: string; password: string }

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalidResponse(): never {
  throw new ApiError('invalid_response', 'The server returned an invalid account response.')
}

function envelope(value: unknown) {
  if (!record(value) || value.success !== true || typeof value.message !== 'string') invalidResponse()
  return value.data
}

function user(value: unknown): AuthUser {
  if (!record(value) || !Number.isSafeInteger(value.id) || Number(value.id) < 1
    || typeof value.name !== 'string' || typeof value.email !== 'string'
    || !USER_ROLES.includes(value.role as UserRole)) invalidResponse()
  return { id: value.id as number, name: value.name, email: value.email, role: value.role as UserRole }
}

export function createAuthApi(client: ApiClient) {
  return {
    async login(credentials: LoginCredentials) {
      const data = envelope(await client.request<unknown>('/auth/login', { method: 'POST', body: credentials, auth: false }))
      if (!record(data) || typeof data.token !== 'string' || !data.token.trim() || /\s/.test(data.token)) invalidResponse()
      return { user: user(data.user), token: data.token }
    },
    async me() {
      return user(envelope(await client.request<unknown>('/auth/me')))
    },
    async logout() {
      if (envelope(await client.request<unknown>('/auth/logout', { method: 'POST' })) !== null) invalidResponse()
    },
  }
}
