import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ShieldOff } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { can, type Capability } from './permissions'
import { useAuth } from './use-auth'

// AuthGate handles sign-in first; this guard also protects direct page links.
export function CapabilityGate({ capability, children }: { capability: Capability; children: ReactNode }) {
  const { status, user } = useAuth()
  if (status === 'authenticated' && can(user, capability)) return children
  return (
    <Card aria-labelledby="access-heading" className="py-12 text-center sm:py-16">
      <ShieldOff aria-hidden="true" className="mx-auto mb-4 size-8 text-muted" />
      <p className="mb-3 text-sm font-semibold text-brand">403</p>
      <h1 id="access-heading" className="text-3xl font-bold tracking-tight">Access denied</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">Your account does not have access to this workspace. Contact your administrator if you need access.</p>
      <Link to="/dashboard" className="mt-5 inline-flex min-h-11 items-center rounded-lg font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Back to dashboard</Link>
    </Card>
  )
}
