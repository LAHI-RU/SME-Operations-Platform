import type { ComponentProps } from 'react'

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

type BadgeProps = ComponentProps<'span'> & {
  tone?: BadgeTone
}

const tones: Record<BadgeTone, string> = {
  success: 'border-success/20 bg-success-soft text-success',
  warning: 'border-warning/20 bg-warning-soft text-warning',
  danger: 'border-danger/20 bg-danger-soft text-danger',
  info: 'border-info/20 bg-info-soft text-info',
  neutral: 'border-neutral/20 bg-neutral-soft text-neutral',
}

export function Badge({ tone = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span {...props} className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold leading-5 ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
