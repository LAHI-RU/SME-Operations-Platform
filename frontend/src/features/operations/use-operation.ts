import { useEffect, useRef, useState } from 'react'
import { ApiError, authStore } from '../../lib/api'
import { can, type Capability } from '../auth/permissions'
import { queryClient } from '../../lib/query-client'
import { notifySuccess } from '../../components/ui/toast-store'

// Prevent duplicate writes and keep late responses out of a subsequent session.
export function useOperation() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  async function run<T>(
    capability: Capability,
    work: () => Promise<T>,
    success: (result: T) => void,
    failure?: (error: unknown) => void,
  ) {
    if (busy.current) return
    const session = authStore.getSnapshot()
    if (!can(session.user, capability)) {
      setError(new ApiError('forbidden', 'You do not have permission to perform this action.'))
      return
    }
    busy.current = true
    setPending(true)
    setError(null)
    try {
      const result = await work()
      if (session.sessionVersion === authStore.getSnapshot().sessionVersion) {
        void queryClient.invalidateQueries({ refetchType: mounted.current ? 'none' : 'active' })
        if (mounted.current) {
          success(result)
          notifySuccess('Changes saved successfully.')
        }
      }
    } catch (error) {
      if (mounted.current && session.sessionVersion === authStore.getSnapshot().sessionVersion) {
        setError(error)
        failure?.(error)
      }
    } finally {
      busy.current = false
      if (mounted.current) setPending(false)
    }
  }
  return { pending, error, run, clearError: () => setError(null) }
}
