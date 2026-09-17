import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, RefreshCw, Warehouse } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/status/StatusBadge'
import { api, ApiError } from '../../lib/api'
import { navigationItems } from '../../lib/navigation'
import { can } from '../auth/permissions'
import { useAuth } from '../auth/use-auth'
import { createDashboardApi, dashboardMetrics } from './dashboard-api'

const dashboardApi = createDashboardApi(api)
const number = new Intl.NumberFormat()
const linkStyle =
  'inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand'
const restricted = (error: unknown) =>
  error instanceof ApiError && ['unauthenticated', 'forbidden'].includes(error.kind)
const message = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Could not load this summary. Please try again.'

function Metric({
  label,
  value,
  pending,
  error,
  updatedAt,
}: {
  label: string
  value: number | undefined
  pending: boolean
  error: unknown
  updatedAt: number
}) {
  const displayValue = restricted(error) ? undefined : value
  return (
    <Card aria-label={label} className="metric-card">
      <h2 className="min-h-10 text-sm font-medium text-muted">{label}</h2>
      <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">
        {displayValue !== undefined ? number.format(displayValue) : pending ? 'Loading...' : 'Unavailable'}
      </p>
      {error ? (
        <p className="mt-3 text-sm text-danger">
          {displayValue !== undefined && 'Last known value. '}
          {message(error)}
        </p>
      ) : (
        updatedAt > 0 && (
          <p className="mt-3 text-xs text-muted">
            Updated{' '}
            <time dateTime={new Date(updatedAt).toISOString()}>
              {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </p>
        )
      )}
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const recent = useQuery({
    queryKey: ['dashboard', 'recent'],
    queryFn: ({ signal }) => dashboardApi.recent(signal),
  })
  const counts = useQueries({
    queries: dashboardMetrics.map(({ status }) => ({
      queryKey: ['dashboard', 'count', status],
      queryFn: ({ signal }: { signal: AbortSignal }) => dashboardApi.count(status, signal),
    })),
  })
  const refreshing = recent.isFetching || counts.some((query) => query.isFetching)
  const failed = recent.isError || counts.some((query) => query.isError)
  const paused = recent.isPaused || counts.some((query) => query.isPaused)
  const orders = restricted(recent.error) ? undefined : recent.data?.orders

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wider text-brand uppercase">
            Operations overview
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Current order status across all accessible orders, for all dates.
          </p>
        </div>
        <Button
          variant="secondary"
          loading={refreshing}
          onClick={() => void queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          {refreshing ? 'Refreshing...' : 'Refresh dashboard'}
        </Button>
      </div>
      <p role="status" className={`text-sm ${failed ? 'text-danger' : 'text-muted'}`}>
        {paused
          ? 'Waiting for a network connection to update summaries.'
          : refreshing
            ? 'Updating order summaries...'
            : failed
              ? 'Some summaries could not be updated. Refresh to try again.'
              : 'Order summaries are up to date.'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Order summaries">
        <Metric
          label="Total orders"
          value={recent.data?.total}
          pending={recent.isPending}
          error={recent.error}
          updatedAt={recent.dataUpdatedAt}
        />
        {dashboardMetrics.map((metric, index) => (
          <Metric
            key={metric.status}
            label={metric.label}
            value={counts[index].data}
            pending={counts[index].isPending}
            error={counts[index].error}
            updatedAt={counts[index].dataUpdatedAt}
          />
        ))}
      </div>
      <Card aria-labelledby="recent-orders-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="recent-orders-heading" className="text-lg font-semibold">
              Recent orders
            </h2>
            <p className="mt-1 text-sm text-muted">The five most recently added orders.</p>
          </div>
          <Link to="/orders" className={linkStyle}>
            Orders workspace
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        {recent.error && (
          <p className="mb-4 text-sm text-danger">
            {orders && 'Showing previously loaded orders. '}
            {message(recent.error)}
          </p>
        )}
        {recent.isPending ? (
          <p className="py-8 text-center text-muted">Loading recent orders...</p>
        ) : !orders ? (
          <p className="py-8 text-center text-muted">Recent orders are unavailable.</p>
        ) : orders.length === 0 ? (
          <p className="py-8 text-center text-muted">No orders yet. New orders will appear here.</p>
        ) : (
          <div
            role="region"
            aria-label="Recent orders table"
            tabIndex={0}
            className="overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-brand"
          >
            <table className="workspace-table w-full text-left text-sm">
              <caption className="sr-only">Five newest accessible orders</caption>
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th scope="col" className="px-3 py-3">
                    Order
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Customer
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-line last:border-0">
                    <th scope="row" className="px-3 py-4 font-semibold whitespace-nowrap">
                      <Link to={`/orders/${order.id}`} className={linkStyle}>
                        {order.order_number}
                      </Link>
                    </th>
                    <td className="max-w-64 px-3 py-4 break-words">
                      {order.customerName ?? 'Customer unavailable'}
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {order.createdAt ? (
                        <time dateTime={order.createdAt}>
                          {new Date(order.createdAt).toLocaleDateString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                      ) : (
                        'Not recorded'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card aria-labelledby="stock-overview-heading">
        <div className="flex items-center gap-3">
          <Warehouse aria-hidden="true" className="size-5 text-brand" />
          <h2 id="stock-overview-heading" className="font-semibold">
            Stock overview
          </h2>
        </div>
        <p className="mt-3 text-sm text-muted">
          Low-stock totals are not available yet. Review stock levels and reorder indicators in the inventory
          workspace.
        </p>
      </Card>
      <section aria-labelledby="explore-heading">
        <h2 id="explore-heading" className="mb-4 font-semibold">
          Explore operations
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {navigationItems
            .filter(
              (item) =>
                ['/orders', '/fulfillment', '/inventory', '/delivery'].includes(item.path) &&
                can(user, item.capability),
            )
            .map(({ path, label, description, icon: Icon }) => (
              <Card key={path} aria-label={label}>
                <Icon aria-hidden="true" className="mb-4 size-5 text-brand" />
                <h3 className="font-semibold">{label}</h3>
                <p className="mt-2 text-sm text-muted">{description}</p>
                <Link to={path} className={`${linkStyle} mt-4`}>
                  Explore {label.toLowerCase()}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Card>
            ))}
        </div>
      </section>
    </>
  )
}
