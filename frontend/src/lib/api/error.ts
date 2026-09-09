import type { FieldErrors } from '../../types/api'

export type ApiErrorKind = 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict'
  | 'validation' | 'rate_limited' | 'server' | 'http' | 'network' | 'timeout'
  | 'cancelled' | 'invalid_response' | 'configuration'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly fieldErrors: FieldErrors

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function httpError(status: number, payload: unknown): ApiError {
  if (status === 401) return new ApiError('unauthenticated', 'Please sign in to continue.', status)
  if (status === 403) return new ApiError('forbidden', 'You do not have permission to perform this action.', status)
  if (status === 404) return new ApiError('not_found', 'The requested record could not be found.', status)
  if (status === 409) {
    // Only the deliberately safe business-conflict envelope supplies display text.
    const message = isRecord(payload) && payload.success === false && typeof payload.message === 'string' && payload.message.trim()
      ? payload.message : 'This action conflicts with the current state. Refresh and check the record.'
    return new ApiError('conflict', message, status)
  }
  if (status === 422) {
    const errors = isRecord(payload) && isRecord(payload.errors) ? payload.errors : {}
    const fields = Object.fromEntries(Object.entries(errors).flatMap(([key, value]) => {
      const messages = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0) : []
      return messages.length ? [[key, messages]] : []
    }))
    return new ApiError('validation', 'Check the highlighted fields and try again.', status, fields)
  }
  if (status === 429) return new ApiError('rate_limited', 'Too many requests. Please wait before trying again.', status)
  // Never retain raw server bodies, request headers, or debug exception details.
  if (status >= 500) return new ApiError('server', 'The server could not complete the request. Please try again later.', status)
  return new ApiError('http', 'The request could not be completed.', status)
}
