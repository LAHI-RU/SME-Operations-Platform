import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useParams } from 'react-router'
import { Check, Circle, RefreshCw, Truck } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import {
  BackLink,
  ConfirmDialog,
  DataTable,
  PageHeading,
  RequestState,
  Textarea,
} from '../../components/ui/Workspace'
import { StatusBadge } from '../../components/status/StatusBadge'
import { ApiError } from '../../lib/api'
import { queryClient } from '../../lib/query-client'
import { can } from '../auth/permissions'
import { useAuth } from '../auth/use-auth'
import { operationsApi, type Order } from '../operations/api'
import {
  displayDate,
  errorMessage,
  humanize,
  linkStyle,
  refreshOperations,
  validId,
} from '../operations/helpers'
import { useOperation } from '../operations/use-operation'
import { workflowActions, workflowStages } from './workflow'

export function OrderDetailPage() {
  const { orderId } = useParams()
  return <OrderDetail key={orderId} orderId={orderId} />
}
function OrderDetail({ orderId }: { orderId?: string }) {
  const id = Number(orderId)
  const query = useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: ({ signal }) => operationsApi.order(id, signal),
    enabled: validId(orderId),
  })
  const location = useLocation()
  if (!validId(orderId)) return <RequestState error={new ApiError('not_found', 'Order not found.')} />
  if (query.isPending || query.isError)
    return <RequestState error={query.error} paused={query.isPaused} retry={() => void query.refetch()} />
  const order = query.data
  const stage =
    order.status === 'PENDING_STOCK' ? 1 : workflowStages.findIndex((status) => status === order.status)
  return (
    <>
      <BackLink to="/orders">All orders</BackLink>
      <PageHeading
        eyebrow="Order workspace"
        title={order.order_number}
        description={`Created ${displayDate(order.created_at)}`}
      >
        <StatusBadge status={order.status} />
        <Button
          variant="secondary"
          loading={query.isFetching}
          onClick={() => {
            void query.refetch()
            void queryClient.invalidateQueries({ queryKey: ['orders', id, 'delivery'] })
          }}
        >
          <RefreshCw className="size-4" />
          Refresh order
        </Button>
      </PageHeading>
      {location.state?.orderCreated && order.status === 'DRAFT' && (
        <p role="status" className="notice-success">
          Draft created. Review the items below before submitting.
        </p>
      )}
      <Card>
        <h2 className="mb-5 font-semibold">Current workflow stage</h2>
        {order.status === 'CANCELLED' ? (
          <p className="text-sm text-muted">This order is cancelled.</p>
        ) : (
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
            {workflowStages.map((status, index) => (
              <li
                key={status}
                aria-current={index === stage ? 'step' : undefined}
                className={`border-t-2 pt-3 ${index <= stage ? 'border-brand' : 'border-line'}`}
              >
                <span
                  className={`mb-2 inline-flex size-7 items-center justify-center rounded-full ${index === stage ? 'bg-brand text-white' : index < stage ? 'bg-brand-soft text-brand' : 'bg-neutral-soft text-muted'}`}
                >
                  {index < stage ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <Circle className="size-3" aria-hidden="true" />
                  )}
                </span>
                <p className={`text-xs ${index === stage ? 'font-bold text-brand' : 'text-muted'}`}>
                  {humanize(status)}
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-5 text-xs text-muted">
          Progress reflects the current order status. A full event history is not available.
        </p>
      </Card>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold">Order items</h2>
              <span className="text-xs text-muted">{order.items.length} line items</span>
            </div>
            <DataTable label="Order line items" headings={['Product', 'Quantity', 'Unit price', 'Subtotal']}>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <th scope="row">
                    <Link className={linkStyle} to={`/products/${item.product_id}`}>
                      {item.product_name ?? 'Product unavailable'}
                    </Link>
                    <p className="text-xs font-normal text-muted">{item.sku ?? '—'}</p>
                  </th>
                  <td className="tabular-nums">{item.quantity}</td>
                  <td className="tabular-nums">{item.unit_price}</td>
                  <td className="font-semibold tabular-nums">{item.subtotal}</td>
                </tr>
              ))}
            </DataTable>
            <div className="flex items-center justify-between border-t border-line pt-5">
              <p className="font-semibold">Order total</p>
              <p className="text-2xl font-bold tabular-nums">{order.total_amount}</p>
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold">Order notes</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted">
              {order.notes || 'No additional notes.'}
            </p>
          </Card>
          <DeliveryDetails order={order} />
        </div>
        <div className="space-y-6">
          <Card>
            <p className="text-xs font-bold tracking-wider text-muted uppercase">Customer</p>
            <h2 className="mt-3 text-lg font-semibold">{order.customer.name ?? 'Customer unavailable'}</h2>
            <p className="text-xs text-muted">{order.customer.customer_code ?? ''}</p>
            {order.customer.id && (
              <Link className={`${linkStyle} mt-3`} to={`/customers/${order.customer.id}`}>
                Customer details →
              </Link>
            )}
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-xs text-muted">Last updated</p>
              <p className="mt-1 text-sm">{displayDate(order.updated_at)}</p>
            </div>
          </Card>
          <OrderActions key={order.status} order={order} />
        </div>
      </div>
    </>
  )
}

function OrderActions({ order }: { order: Order }) {
  const { user } = useAuth()
  const action = workflowActions[order.status]
  const operation = useOperation()
  const [review, setReview] = useState<{ notes: string; assigned_to: string } | null>(null)
  const [notice, setNotice] = useState('')
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ defaultValues: { notes: '', assigned_to: '' } })
  if (order.status === 'PENDING_STOCK')
    return (
      <Card className="border-warning/30 bg-warning-soft">
        <h2 className="font-semibold text-warning">Waiting for stock</h2>
        <p className="mt-3 text-sm text-warning">
          Some items could not be allocated. Replenish stock in Inventory and contact your administrator. This
          backend currently does not allow confirmation to be retried from this state.
        </p>
        <Link className={`${linkStyle} mt-3`} to="/inventory">
          Review inventory →
        </Link>
      </Card>
    )
  if (!action)
    return (
      <Card>
        <h2 className="font-semibold">
          {order.status === 'DELIVERED' ? 'Order completed' : 'No further actions'}
        </h2>
        <p className="mt-3 text-sm text-muted">
          {order.status === 'DELIVERED'
            ? 'This order has reached the end of its delivery workflow.'
            : 'There are no available workflow actions for this order.'}
        </p>
      </Card>
    )
  if (!can(user, action.capability))
    return (
      <Card>
        <h2 className="font-semibold">Next step</h2>
        <p className="mt-3 text-sm font-medium">{action.label}</p>
        <p className="mt-2 text-sm text-muted">
          An authorized team member can complete this step. Refresh the order to see their updates.
        </p>
      </Card>
    )
  function execute() {
    if (!action || !review) return
    const body = action.assignment
      ? { assigned_to: Number(review.assigned_to) }
      : action.notes
        ? { notes: review.notes.trim() || null }
        : undefined
    void operation.run(
      action.capability,
      () => operationsApi.action(order.id, action.action, body),
      (result) => {
        if ('order_number' in result) queryClient.setQueryData(['orders', 'detail', order.id], result)
        if ('assigned_at' in result) queryClient.setQueryData(['orders', order.id, 'delivery'], result)
        refreshOperations()
        setReview(null)
        setNotice('Action completed. Refreshing the order status...')
      },
      (error) => {
        if (error instanceof ApiError && error.kind === 'validation') {
          setReview(null)
          for (const field of ['notes', 'assigned_to'] as const)
            if (error.fieldErrors[field]?.[0]) setError(field, { message: error.fieldErrors[field][0] })
        }
        if (error instanceof ApiError && error.kind === 'conflict') refreshOperations()
      },
    )
  }
  return (
    <Card className="border-brand/25">
      <p className="text-xs font-bold tracking-wider text-brand uppercase">Next action</p>
      <h2 className="mt-3 text-lg font-semibold">{action.label}</h2>
      <p className="mt-3 text-sm text-muted">{action.description}</p>
      {notice && (
        <p role="status" className="notice-success mt-4">
          {notice}
        </p>
      )}
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={(event) => {
          void handleSubmit((values) => {
            operation.clearError()
            setReview(values)
          })(event)
        }}
      >
        <fieldset disabled={operation.pending}>
          {action.assignment && (
            <Input
              label="Delivery user ID"
              type="number"
              min="1"
              step="1"
              required
              hint="Use the existing account ID supplied by your administrator."
              {...register('assigned_to', {
                validate: (value) =>
                  (Number.isSafeInteger(Number(value)) && Number(value) > 0) || 'Enter an existing user ID.',
              })}
              error={errors.assigned_to?.message}
            />
          )}
          {action.notes && (
            <Textarea
              label="Completion notes"
              maxLength={2000}
              {...register('notes', { maxLength: { value: 2000, message: 'Use at most 2000 characters.' } })}
              error={errors.notes?.message}
            />
          )}
        </fieldset>
        {Boolean(operation.error) && !review && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(operation.error)}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={operation.pending || Boolean(notice)}>
          {action.label}
        </Button>
      </form>
      {review && (
        <ConfirmDialog
          title={`${action.label}?`}
          pending={operation.pending}
          error={operation.error}
          onCancel={() => setReview(null)}
          onConfirm={execute}
        >
          {action.description}
          {action.assignment && <p className="mt-3 font-semibold">Assign to user #{review.assigned_to}</p>}
        </ConfirmDialog>
      )}
    </Card>
  )
}

function DeliveryDetails({ order }: { order: Order }) {
  const expected = ['ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)
  const query = useQuery({
    queryKey: ['orders', order.id, 'delivery'],
    queryFn: ({ signal }) => operationsApi.delivery(order.id, signal),
    enabled: expected,
  })
  return (
    <Card>
      <div className="mb-5 flex items-center gap-3">
        <Truck className="size-5 text-brand" />
        <h2 className="font-semibold">Delivery tracking</h2>
      </div>
      {!expected ? (
        <p className="text-sm text-muted">
          Delivery details will appear after this order is assigned for dispatch.
        </p>
      ) : query.isPending || query.isError ? (
        <RequestState error={query.error} paused={query.isPaused} retry={() => void query.refetch()} />
      ) : (
        <>
          <p className="mb-5 text-sm text-muted">
            Assigned account{' '}
            <span className="font-semibold text-ink">
              {query.data.assigned_to ? `#${query.data.assigned_to}` : 'Not recorded'}
            </span>
          </p>
          <ol className="space-y-5">
            {[
              ['Assigned', query.data.assigned_at],
              ['Out for delivery', query.data.out_for_delivery_at],
              ['Delivered', query.data.delivered_at],
            ].map(([label, date]) => (
              <li key={label} className="flex items-center gap-4">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${date ? 'bg-brand-soft text-brand' : 'bg-neutral-soft text-muted'}`}
                >
                  {date ? <Check className="size-4" /> : <Circle className="size-3" />}
                </span>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted">{date ? displayDate(date) : 'Awaiting this step'}</p>
                </div>
              </li>
            ))}
          </ol>
          {query.data.notes && (
            <p className="mt-5 whitespace-pre-wrap break-words border-t border-line pt-4 text-sm text-muted">
              {query.data.notes}
            </p>
          )}
        </>
      )}
    </Card>
  )
}
