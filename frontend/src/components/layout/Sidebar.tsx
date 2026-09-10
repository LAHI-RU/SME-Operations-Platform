import { Layers } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { visibleNavigationGroups } from '../../lib/navigation'
import { useAuth } from '../../features/auth/use-auth'

export function WorkspaceBrand() {
  return (
    <Link to="/dashboard" className="flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white"><Layers aria-hidden="true" className="size-5" /></span>
      <span><span className="block text-sm font-bold tracking-tight">SME Operations</span><span className="block text-xs text-muted">Fulfillment & inventory</span></span>
    </Link>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { status, user } = useAuth()
  return (
    <nav aria-label="Main navigation" className="space-y-6">
      {visibleNavigationGroups(status === 'authenticated' ? user : null).map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-semibold tracking-wider text-muted uppercase">{group.label}</p>
          <ul className="space-y-1">
            {group.items.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <NavLink to={path} end={path !== '/products'} onClick={onNavigate} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-canvas hover:text-ink'}`}>
                  <Icon aria-hidden="true" className="size-4 shrink-0" />{label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
