import { ApiError } from '../../lib/api'

export const productLinkStyle = 'inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand'
export const catalogErrorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'Could not complete this request. Please try again.'

