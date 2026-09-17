import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useParams, useSearchParams } from 'react-router'
import { ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import {
  BackLink,
  ConfirmDialog,
  DataTable,
  EmptyState,
  PageHeading,
  Pagination,
  RequestState,
  Select,
  Textarea,
} from '../../components/ui/Workspace'
import { ApiError } from '../../lib/api'
import { queryClient } from '../../lib/query-client'
import { Can } from '../auth/Can'
import { productsApi, productDetailQuery } from '../products/product-queries'
import { operationsApi, type StockChange } from '../operations/api'
import {
  displayDate,
  errorMessage,
  humanize,
  linkStyle,
  pageNumber,
  refreshOperations,
  validId,
} from '../operations/helpers'
import { useOperation } from '../operations/use-operation'

export function InventoryPage() {
  const [params, setParams] = useSearchParams()
  const page = pageNumber(params.get('page'))
  const query = useQuery({
    queryKey: ['products', 'list', page],
    queryFn: ({ signal }) => productsApi.list(page, signal),
  })
  return (
    <>
      <PageHeading
        eyebrow="Warehouse"
        title="Inventory"
        description="Know what is available. Track every stock movement."
      />
      {query.isPending || query.isError ? (
        <RequestState error={query.error} paused={query.isPaused} retry={() => void query.refetch()} />
      ) : (
        <Card>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Stock availability</h2>
              <p className="mt-1 text-xs text-muted">
                Low stock means on-hand quantity is at or below the product’s reorder level.
              </p>
            </div>
            <Button variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>
              <RefreshCw className="size-4" />
              Refresh stock
            </Button>
          </div>
          {!query.data.data.length ? (
            <EmptyState
              title={
                query.data.meta.total ? 'No products on this page' : 'Your inventory starts with a product'
              }
              description="Create products in your catalog, then receive their opening stock here."
            >
              <Link to="/products" className={linkStyle}>
                Open product catalog →
              </Link>
            </EmptyState>
          ) : (
            <DataTable
              label="Inventory availability"
              headings={['Product', 'On hand', 'Reorder level', 'Availability', 'Movements']}
            >
              {query.data.data.map((product) => (
                <tr key={product.id}>
                  <th scope="row">
                    <Link className={linkStyle} to={`/inventory/${product.id}`}>
                      {product.name}
                    </Link>
                    <p className="text-xs font-normal text-muted">{product.sku}</p>
                  </th>
                  <td className="font-semibold tabular-nums">{product.inventory.quantity}</td>
                  <td className="tabular-nums">{product.reorder_level}</td>
                  <td>
                    <Badge
                      tone={
                        product.inventory.quantity === 0
                          ? 'danger'
                          : product.inventory.quantity <= product.reorder_level
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {product.inventory.quantity === 0
                        ? 'Out of stock'
                        : product.inventory.quantity <= product.reorder_level
                          ? 'Low stock'
                          : 'In stock'}
                    </Badge>
                  </td>
                  <td>
                    <Link className={linkStyle} to={`/inventory/${product.id}`}>
                      Manage stock
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
            onPage={(page) => setParams({ page: String(page) })}
          />
        </Card>
      )}
    </>
  )
}

export function InventoryDetailPage() {
  const { productId } = useParams()
  return <InventoryDetail key={productId} productId={productId} />
}
function InventoryDetail({ productId }: { productId?: string }) {
  const id = Number(productId)
  const [params, setParams] = useSearchParams()
  const page = pageNumber(params.get('page'))
  const [direction, setDirection] = useState<'in' | 'out' | null>(null)
  const [notice, setNotice] = useState('')
  const valid = validId(productId)
  const stock = useQuery({
    queryKey: ['inventory', id],
    queryFn: ({ signal }) => operationsApi.inventory(id, signal),
    enabled: valid,
  })
  const product = useQuery({ ...productDetailQuery(id), enabled: valid })
  const transactions = useQuery({
    queryKey: ['inventory', id, 'transactions', page],
    queryFn: ({ signal }) => operationsApi.transactions(id, page, signal),
    enabled: valid,
  })
  if (!valid) return <RequestState error={new ApiError('not_found', 'Product not found.')} />
  if (stock.isPending || stock.isError)
    return <RequestState error={stock.error} paused={stock.isPaused} retry={() => void stock.refetch()} />
  return (
    <>
      <BackLink to="/inventory">All inventory</BackLink>
      <PageHeading
        eyebrow={stock.data.product.sku ?? 'Inventory'}
        title={stock.data.product.name ?? 'Product inventory'}
        description="Receive stock, record adjustments, and review the movement ledger."
      >
        <Can capability="inventory.stockIn">
          <Button
            onClick={() => {
              setNotice('')
              setDirection('in')
            }}
          >
            <ArrowDownLeft className="size-4" />
            Stock in
          </Button>
        </Can>
        <Can capability="inventory.stockOut">
          <Button
            variant="secondary"
            onClick={() => {
              setNotice('')
              setDirection('out')
            }}
          >
            <ArrowUpRight className="size-4" />
            Stock out
          </Button>
        </Can>
      </PageHeading>
      {notice && (
        <p role="status" className="notice-success">
          {notice}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold text-muted uppercase">Stock on hand</p>
          <p className="mt-2 text-4xl font-bold tabular-nums">
            {stock.data.quantity}
            <span className="ml-2 text-sm font-normal text-muted">units</span>
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-muted uppercase">Reorder level</p>
          <p className="mt-2 text-4xl font-bold tabular-nums">{product.data?.reorder_level ?? '—'}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-muted uppercase">Last stock update</p>
          <p className="mt-3 text-sm font-medium">{displayDate(stock.data.updated_at)}</p>
          <Link className={linkStyle} to={`/products/${id}`}>
            Product details →
          </Link>
        </Card>
      </div>
      {direction && (
        <StockForm
          key={direction}
          id={id}
          direction={direction}
          onCancel={() => setDirection(null)}
          onSaved={(quantity) => {
            setDirection(null)
            setNotice(
              `Stock ${direction === 'in' ? 'received' : 'issued'}. Current stock: ${quantity} units.`,
            )
            setParams({ page: '1' })
          }}
        />
      )}
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Movement history</h2>
            <p className="mt-1 text-sm text-muted">
              Newest transactions first. Outgoing quantities are negative.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void stock.refetch()
              void transactions.refetch()
            }}
            loading={stock.isFetching || transactions.isFetching}
          >
            Refresh movements
          </Button>
        </div>
        {transactions.isPending || transactions.isError ? (
          <RequestState
            error={transactions.error}
            paused={transactions.isPaused}
            retry={() => void transactions.refetch()}
          />
        ) : (
          <>
            {!transactions.data.data.length ? (
              <EmptyState
                title="No stock movements"
                description="Received stock, adjustments, and order deductions appear here."
              />
            ) : (
              <DataTable
                label="Inventory transactions"
                headings={['Date', 'Type', 'Quantity', 'Reference', 'Notes']}
              >
                {transactions.data.data.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="whitespace-nowrap">{displayDate(transaction.created_at)}</td>
                    <td>
                      <Badge tone={transaction.quantity > 0 ? 'success' : 'warning'}>
                        {humanize(transaction.type)}
                      </Badge>
                    </td>
                    <td
                      className={`font-semibold tabular-nums ${transaction.quantity > 0 ? 'text-success' : 'text-danger'}`}
                    >
                      {transaction.quantity > 0 ? '+' : ''}
                      {transaction.quantity}
                    </td>
                    <td>
                      {transaction.reference_type
                        ? `${transaction.reference_type}${transaction.reference_id ? ` #${transaction.reference_id}` : ''}`
                        : '—'}
                    </td>
                    <td className="max-w-sm whitespace-pre-wrap break-words">{transaction.notes ?? '—'}</td>
                  </tr>
                ))}
              </DataTable>
            )}
            <Pagination
              meta={transactions.data.meta}
              page={page}
              busy={transactions.isFetching}
              onPage={(page) => setParams({ page: String(page) })}
            />
          </>
        )}
      </Card>
    </>
  )
}

interface StockValues {
  quantity: string
  type: StockChange['type']
  notes: string
  reference_type: string
  reference_id: string
}
function StockForm({
  id,
  direction,
  onCancel,
  onSaved,
}: {
  id: number
  direction: 'in' | 'out'
  onCancel: () => void
  onSaved: (quantity: number) => void
}) {
  const operation = useOperation()
  const [review, setReview] = useState<StockValues | null>(null)
  const types =
    direction === 'in'
      ? (['PURCHASE', 'RETURN', 'ADJUSTMENT_IN'] as const)
      : (['SALE', 'ADJUSTMENT_OUT'] as const)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<StockValues>({
    defaultValues: { quantity: '', type: types[0], notes: '', reference_type: '', reference_id: '' },
  })
  function save() {
    if (!review) return
    void operation.run(
      direction === 'in' ? 'inventory.stockIn' : 'inventory.stockOut',
      () =>
        operationsApi.stock(id, direction, {
          quantity: Number(review.quantity),
          type: review.type,
          notes: review.notes.trim() || null,
          reference_type: review.reference_type.trim() || null,
          reference_id: review.reference_id ? Number(review.reference_id) : null,
        }),
      (result) => {
        queryClient.setQueryData(['inventory', id], result)
        refreshOperations()
        onSaved(result.quantity)
      },
      (error) => {
        if (error instanceof ApiError && error.kind === 'validation') {
          setReview(null)
          for (const field of ['quantity', 'type', 'notes', 'reference_type', 'reference_id'] as const)
            if (error.fieldErrors[field]?.[0]) setError(field, { message: error.fieldErrors[field][0] })
        }
      },
    )
  }
  return (
    <Card className="border-brand/30">
      <h2 className="mb-5 text-lg font-semibold">{direction === 'in' ? 'Receive stock' : 'Issue stock'}</h2>
      <form
        noValidate
        onSubmit={(event) => {
          void handleSubmit((values) => {
            operation.clearError()
            setReview(values)
          })(event)
        }}
      >
        <fieldset disabled={operation.pending} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Quantity"
              type="number"
              min="1"
              step="1"
              required
              {...register('quantity', {
                validate: (value) =>
                  (Number.isSafeInteger(Number(value)) && Number(value) > 0) ||
                  'Enter a positive whole quantity.',
              })}
              error={errors.quantity?.message}
            />
            <Select label="Movement type" {...register('type')} error={errors.type?.message}>
              {types.map((type) => (
                <option value={type} key={type}>
                  {humanize(type)}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Notes"
            maxLength={1000}
            {...register('notes', { maxLength: { value: 1000, message: 'Use at most 1000 characters.' } })}
            error={errors.notes?.message}
          />
          <details className="rounded-lg border border-line p-4">
            <summary className="cursor-pointer text-sm font-medium">Optional reference</summary>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Input
                label="Reference type"
                maxLength={100}
                {...register('reference_type', { maxLength: 100 })}
                error={errors.reference_type?.message}
              />
              <Input
                label="Reference ID"
                type="number"
                min="1"
                step="1"
                {...register('reference_id', {
                  validate: (value) =>
                    !value ||
                    (Number.isSafeInteger(Number(value)) && Number(value) > 0) ||
                    'Enter a positive whole ID.',
                })}
                error={errors.reference_id?.message}
              />
            </div>
          </details>
        </fieldset>
        {Boolean(operation.error) && !review && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {errorMessage(operation.error)}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={operation.pending}>
            Review movement
          </Button>
          <Button variant="secondary" disabled={operation.pending} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
      {review && (
        <ConfirmDialog
          title={direction === 'in' ? 'Receive stock?' : 'Issue stock?'}
          pending={operation.pending}
          error={operation.error}
          onCancel={() => setReview(null)}
          onConfirm={save}
        >
          Record {humanize(review.type).toLowerCase()} of <strong>{review.quantity} units</strong>. This
          changes the stock balance and adds a ledger entry.
        </ConfirmDialog>
      )}
    </Card>
  )
}
