import { useEffect, useSyncExternalStore } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { toastStore } from './toast-store'
import { useAuth } from '../../features/auth/use-auth'
export function Toasts() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot)
  const { sessionVersion } = useAuth()
  useEffect(() => {
    toastStore.clear()
  }, [sessionVersion])
  useEffect(() => {
    const timers = toasts.map((toast) => setTimeout(() => toastStore.dismiss(toast.id), 6000))
    return () => timers.forEach(clearTimeout)
  }, [toasts])
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 space-y-2 sm:left-auto sm:w-96"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 rounded-xl border border-success/20 bg-surface p-4 text-sm shadow-lg"
        >
          <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
          <p className="flex-1 font-medium">{toast.message}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            className="rounded-lg p-2 hover:bg-canvas"
            onClick={() => toastStore.dismiss(toast.id)}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
