import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import {
  DataTable,
  EmptyState,
  PageHeading,
  Pagination,
  RequestState,
  Select,
} from '../../components/ui/Workspace'
import { StatusBadge } from '../../components/status/StatusBadge'
import { Can } from '../auth/Can'
import { operationsApi } from '../operations/api'
import { displayDate, humanize, linkStyle, pageNumber } from '../operations/helpers'
import { ORDER_STATUSES } from '../../types/order'

export function OrdersPage({ mode = 'orders' }: { mode?: 'orders' | 'fulfillment' | 'delivery' }) {
  const [params, setParams] = useSearchParams()
  const page = pageNumber(params.get('page'))
  const statuses =
    mode === 'fulfillment'
      ? ['CONFIRMED', 'PACKING', 'READY_FOR_DELIVERY']
      : mode === 'delivery'
        ? ['READY_FOR_DELIVERY', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED']
        : [...ORDER_STATUSES]
  const defaultStatus = mode === 'fulfillment' ? 'CONFIRMED' : mode === 'delivery' ? 'READY_FOR_DELIVERY' : ''
  const status = statuses.includes(params.get('status') ?? '') ? params.get('status')! : defaultStatus
  const search = (params.get('search') ?? '').slice(0, 100)
  const customer = params.get('customer_id')
  const customerId =
    customer && /^\d+$/.test(customer) && Number.isSafeInteger(Number(customer)) && Number(customer) > 0
      ? Number(customer)
      : undefined
  const query = useQuery({
    queryKey: ['orders', 'list', { page, status, search, customerId }],
    queryFn: ({ signal }) =>
      operationsApi.orders(
        {
          page,
          per_page: 15,
          status: status || undefined,
          search: search || undefined,
          customer_id: customerId,
        },
        signal,
      ),
  })
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }
  const title = humanize(mode)
  return (
    <>
      <PageHeading
        eyebrow={mode === 'orders' ? 'Sales workspace' : 'Operations workspace'}
        title={title}
        description={
          mode === 'orders'
            ? 'Every order, from the first draft to the final delivery.'
            : mode === 'fulfillment'
              ? 'A focused queue for picking, packing, and handoff.'
              : 'Plan dispatch, follow deliveries, and close the loop.'
        }
      >
        <Can capability="orders.create">
          {mode === 'orders' && (
            <Link to="/orders/new" className="button-link">
              <Plus className="size-4" />
              New order
            </Link>
          )}
        </Can>
      </PageHeading>
      {mode !== 'orders' && (
        <div className="flex flex-wrap gap-2" aria-label={`${title} queues`}>
          {statuses.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ status: value, page: '1' })}
              aria-pressed={status === value}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${status === value ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:border-brand'}`}
            >
              {humanize(value)}
            </button>
          ))}
        </div>
      )}
      <Card>
        <form
          key={`${search}-${status}-${customerId}`}
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            update({
              search: String(data.get('search') ?? '').trim(),
              status: String(data.get('status') ?? status),
              page: '1',
            })
          }}
          className="grid items-end gap-4 md:grid-cols-[1fr_15rem_auto]"
        >
          <Input
            label="Search orders"
            name="search"
            defaultValue={search}
            maxLength={100}
            placeholder="Order number or customer name"
          />
          {mode === 'orders' ? (
            <Select label="Order status" name="status" defaultValue={status}>
              <option value="">All statuses</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </Select>
          ) : (
            <p className="pb-3 text-sm text-muted">Showing {humanize(status).toLowerCase()} orders</p>
          )}
          <Button variant="secondary" type="submit">
            <Search aria-hidden="true" className="size-4" />
            Apply filters
          </Button>
        </form>
        {customerId && (
          <p className="mt-4 text-sm text-muted">
            Customer #{customerId}{' '}
            <button
              className="ml-3 font-semibold text-brand hover:underline"
              onClick={() => update({ customer_id: '', page: '1' })}
            >
              Clear customer filter
            </button>
          </p>
        )}
      </Card>
      {query.isPending || query.isError ? (
        <RequestState error={query.error} paused={query.isPaused} retry={() => void query.refetch()} />
      ) : (
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">{query.data.meta.total.toLocaleString()} orders</h2>
            <Button variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>
              <RefreshCw className="size-4" />
              Refresh orders
            </Button>
          </div>
          {!query.data.data.length ? (
            <EmptyState
              title="No orders to show"
              description={
                search || status || customerId
                  ? 'There are no orders matching this view. Try another status or search.'
                  : 'Create a draft order to start your fulfillment workflow.'
              }
            />
          ) : (
            <DataTable
              label={`${title} orders`}
              headings={['Order', 'Customer', 'Status', 'Total', 'Created', 'Details']}
            >
              {query.data.data.map((order) => (
                <tr key={order.id}>
                  <th scope="row">
                    <Link className={linkStyle} to={`/orders/${order.id}`}>
                      {order.order_number}
                    </Link>
                    <p className="text-xs font-normal text-muted">{order.items.length} line items</p>
                  </th>
                  <td>{order.customer.name ?? 'Customer unavailable'}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="font-semibold tabular-nums">{order.total_amount}</td>
                  <td className="whitespace-nowrap text-muted">{displayDate(order.created_at)}</td>
                  <td>
                    <Link className={linkStyle} to={`/orders/${order.id}`}>
                      Open order
                    </Link>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
          <Pagination
            meta={query.data.meta}
            page={page}
            busy={query.isFetching}
            onPage={(page) => update({ page: String(page) })}
          />
        </Card>
      )}
    </>
  )
}
