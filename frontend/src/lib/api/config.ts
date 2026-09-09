import { ApiError } from './error'

export function normalizeApiBaseUrl(value: string): string {
  const base = value.trim().replace(/\/+$/, '')
  const invalid = () => new ApiError('configuration', 'Set VITE_API_BASE_URL to an HTTP(S) URL or root-relative path ending in /api/v1.')
  if (!base || /[\s\\?#]/.test(base) || base.startsWith('//')) throw invalid()
  let url: URL
  try {
    url = new URL(base, 'https://same-origin.invalid')
  } catch {
    throw invalid()
  }
  if ((!base.startsWith('/') && !/^https?:\/\//.test(base))
    || !['http:', 'https:'].includes(url.protocol) || url.username || url.password
    || !url.pathname.endsWith('/api/v1')) throw invalid()
  return base.startsWith('/') ? url.pathname : url.href
}
