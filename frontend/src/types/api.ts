export interface ResourceResponse<T> {
  data: T
}

export interface MessageResponse<T> extends ResourceResponse<T> {
  success: boolean
  message: string
}

export interface PaginatedResponse<T> extends ResourceResponse<T[]> {
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
  meta: {
    current_page: number
    from: number | null
    last_page: number
    links: { url: string | null; label: string; active: boolean; page?: number | null }[]
    path: string
    per_page: number
    to: number | null
    total: number
  }
}

export type FieldErrors = Record<string, string[]>
