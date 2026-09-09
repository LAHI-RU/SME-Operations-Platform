import { ArrowRight, Compass } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '../components/ui/Card'
import { navigationItems, type NavigationItem } from '../lib/navigation'

const linkStyle = 'inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand'

export function DashboardPreview() {
  return (
    <>
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wider text-brand uppercase">Workspace</p>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-3 max-w-2xl text-muted">A shared place for orders, stock, and delivery. Explore the workspace while the operational screens are being built.</p>
      </div>
      <Card aria-labelledby="overview-heading" className="border-brand/20 bg-brand-soft">
        <Compass aria-hidden="true" className="mb-4 size-8 text-brand" />
        <h2 id="overview-heading" className="text-xl font-semibold">Your workspace is taking shape</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">Live summaries will appear once business data is connected. For now, use the navigation to explore each area.</p>
      </Card>
      <section aria-labelledby="explore-heading">
        <h2 id="explore-heading" className="mb-4 font-semibold">Explore operations</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {navigationItems.filter((item) => ['/orders', '/inventory', '/delivery'].includes(item.path)).map(({ path, label, description, icon: Icon }) => (
            <Card key={path} aria-label={label}>
              <Icon aria-hidden="true" className="mb-4 size-5 text-brand" />
              <h3 className="font-semibold">{label}</h3>
              <p className="mt-2 text-sm text-muted">{description}</p>
              <Link to={path} className={`${linkStyle} mt-4`}>Explore {label.toLowerCase()}<ArrowRight aria-hidden="true" className="size-4" /></Link>
            </Card>
          ))}
        </div>
      </section>
    </>
  )
}

export function ModulePreview({ item }: { item: NavigationItem }) {
  const Icon = item.icon
  return (
    <>
      <div><h1 className="text-3xl font-bold tracking-tight">{item.label}</h1><p className="mt-3 text-muted">{item.description}</p></div>
      <Card aria-labelledby="module-preview-heading" className="py-12 text-center sm:py-16">
        <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Icon aria-hidden="true" className="size-6" /></span>
        <h2 id="module-preview-heading" className="text-lg font-semibold">{item.label} workspace coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">This page is a navigation preview. Records and actions will be available when this module is connected.</p>
        <Link to="/dashboard" className={`${linkStyle} mt-5`}>Back to dashboard<ArrowRight aria-hidden="true" className="size-4" /></Link>
      </Card>
    </>
  )
}

export function NotFoundPage() {
  return (
    <Card aria-labelledby="not-found-heading" className="py-12 text-center sm:py-16">
      <p className="mb-3 text-sm font-semibold text-brand">404</p>
      <h1 id="not-found-heading" className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 text-muted">Check the address or return to your workspace.</p>
      <Link to="/dashboard" className={`${linkStyle} mt-5`}>Back to dashboard<ArrowRight aria-hidden="true" className="size-4" /></Link>
    </Card>
  )
}
