import type { ComponentProps } from 'react'

export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return <section {...props} className={`min-w-0 rounded-xl border border-line bg-surface p-5 sm:p-6 ${className}`} />
}
