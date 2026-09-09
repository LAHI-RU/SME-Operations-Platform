import { LogOut, Menu, UserRound } from 'lucide-react'
import { useRef } from 'react'
import { useLocation } from 'react-router'
import { findNavigationItem } from '../../lib/navigation'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Sidebar, WorkspaceBrand } from './Sidebar'
import { useAuth } from '../../features/auth/use-auth'
import { authStore } from '../../lib/api'

export function Topbar() {
  const { user, signingOut, error, notice } = useAuth()
  const { pathname } = useLocation()
  const mobileNavigation = useRef<HTMLDetailsElement>(null)
  const title = findNavigationItem(pathname)?.label ?? 'Page not found'

  function closeNavigation() {
    if (mobileNavigation.current) mobileNavigation.current.open = false
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="flex min-h-20 flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="lg:hidden"><WorkspaceBrand /></div>
        <p className="hidden text-sm text-muted lg:block">Workspace <span aria-hidden="true" className="mx-2">/</span> <span className="font-medium text-ink">{title}</span></p>
        <div className="flex flex-wrap items-center gap-3">
          <UserRound aria-hidden="true" className="hidden size-5 text-muted sm:block" />
          <div className="min-w-0 max-w-56"><p className="truncate text-sm font-medium" title={user?.name}>{user?.name}</p><p className="text-xs text-muted">{user?.role}</p></div>
          <Button variant="secondary" loading={signingOut} onClick={() => void authStore.logout()}><LogOut aria-hidden="true" className="size-4" />{signingOut ? 'Signing out...' : 'Sign out'}</Button>
        </div>
      </div>
      {error && <p role="alert" className="border-t border-line px-4 py-3 text-sm text-danger sm:px-6 lg:px-8">Sign-out failed. {error}</p>}
      {notice && <p role="status" className="border-t border-line px-4 py-3 text-sm text-warning sm:px-6 lg:px-8">{notice}</p>}
      <details
        key={pathname}
        ref={mobileNavigation}
        className="border-t border-line lg:hidden"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && mobileNavigation.current?.open) {
            event.preventDefault()
            closeNavigation()
            mobileNavigation.current.querySelector('summary')?.focus()
          }
        }}
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand sm:px-6 [&::-webkit-details-marker]:hidden">
          <Menu aria-hidden="true" className="size-5" />Menu<span className="ml-auto text-xs font-normal text-muted">{title}</span>
        </summary>
        <div className="border-t border-line px-4 py-5 sm:px-6">
          <Sidebar onNavigate={() => {
            closeNavigation()
            document.getElementById('main')?.focus()
          }} />
        </div>
      </details>
      <div className="flex items-start gap-3 border-t border-line bg-brand-soft px-4 py-3 sm:px-6 lg:px-8">
        <Badge tone="info" className="shrink-0">Layout preview</Badge>
        <p id="layout-preview-note" className="text-sm text-muted">Business modules are still previews. Your account is connected.</p>
      </div>
    </header>
  )
}
