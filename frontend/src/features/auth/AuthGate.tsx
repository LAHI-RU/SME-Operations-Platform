import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { authStore } from '../../lib/api'
import { useAuth } from './use-auth'

export function AuthGate({ guest = false }: { guest?: boolean }) {
  const state = useAuth()
  const location = useLocation()
  if (state.status === 'loading' || state.status === 'unavailable') {
    return (
      <main className="grid min-h-dvh place-items-center px-4 py-8">
        <Card aria-labelledby="session-heading" className="w-full max-w-md">
          <h1 id="session-heading" className="text-xl font-semibold">{state.status === 'loading' ? 'Checking your session' : 'Could not verify your session'}</h1>
          {state.status === 'loading' ? <p role="status" className="mt-4 flex items-center gap-2 text-muted"><LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Please wait...</p> : <>
            <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p>
            <div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => void authStore.restore()}>Try again</Button><Button variant="secondary" onClick={() => authStore.forget()}>Sign out on this device</Button></div>
          </>}
        </Card>
      </main>
    )
  }
  if (guest && state.status === 'authenticated') return <Navigate to={safeReturnPath(location.state)} replace />
  if (!guest && state.status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  }
  return <Outlet />
}

function safeReturnPath(state: unknown): string {
  const from = typeof state === 'object' && state !== null && 'from' in state ? state.from : null
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || /[\\\s]/.test(from)) return '/dashboard'
  const parsed = new URL(from, 'https://workspace.invalid')
  if (parsed.origin !== 'https://workspace.invalid' || /^\/login\/*$/i.test(parsed.pathname)) return '/dashboard'
  return parsed.pathname + parsed.search + parsed.hash
}
