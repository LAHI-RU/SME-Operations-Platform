import { useSyncExternalStore } from 'react'
import { authStore } from '../../lib/api'

export function useAuth() {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getSnapshot)
}
