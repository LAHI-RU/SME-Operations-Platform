import type { ReactNode } from 'react'
import { can, type Capability } from './permissions'
import { useAuth } from './use-auth'

export function Can({ capability, children }: { capability: Capability; children: ReactNode }) {
  const { status, user } = useAuth()
  return status === 'authenticated' && can(user, capability) ? children : null
}
