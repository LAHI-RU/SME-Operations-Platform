import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import { findNavigationItem } from '../../lib/navigation'
import { Sidebar, WorkspaceBrand } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuth } from '../../features/auth/use-auth'
import { can } from '../../features/auth/permissions'

export function AppLayout() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const page = findNavigationItem(pathname)
  const denied = page ? !can(user, page.capability) : false
  const main = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)
  const previousDenied = useRef(denied)

  useEffect(() => {
    const page = findNavigationItem(pathname)
    document.title = `${denied ? 'Access denied' : (page?.label ?? 'Page not found')} | SME Operations`
    if (previousPath.current !== pathname || previousDenied.current !== denied) {
      main.current?.focus()
      window.scrollTo({ top: 0, behavior: 'instant' })
      previousPath.current = pathname
      previousDenied.current = denied
    }
  }, [pathname, denied])

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-brand p-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <aside className="desktop-sidebar fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 py-5">
          <WorkspaceBrand />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <Sidebar />
        </div>
        <p className="border-t border-line px-6 py-4 text-xs text-muted">One workspace. Every operation.</p>
      </aside>
      <div className="min-w-0 lg:pl-64">
        <Topbar />
        <main
          ref={main}
          id="main"
          tabIndex={-1}
          className="mx-auto max-w-7xl space-y-6 px-4 py-8 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand sm:px-6 lg:px-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
