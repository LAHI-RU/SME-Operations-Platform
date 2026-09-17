import { useInfiniteQuery } from '@tanstack/react-query'
import { useFieldArray, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Plus, Trash2 } from 'lucide-react'
import { BackLink, PageHeading, Select, Textarea } from '../../components/ui/Workspace'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ApiError } from '../../lib/api'
import { operationsApi } from '../operations/api'
import { productsApi } from '../products/product-queries'
import { useOperation } from '../operations/use-operation'
import { errorMessage, previewTotal, refreshOperations } from '../operations/helpers'
import { queryClient } from '../../lib/query-client'

interface OrderValues {
  customer_id: string
  items: { product_id: string; quantity: string }[]
  notes: string
}
export function OrderFormPage() {
  const navigate = useNavigate()
  const operation = useOperation()
  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<OrderValues>({
    defaultValues: { customer_id: '', items: [{ product_id: '', quantity: '1' }], notes: '' },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = useWatch({ control, name: 'items' })
  const customers = useInfiniteQuery({
    queryKey: ['customers', 'order-options'],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => operationsApi.directoryList('customers', pageParam, signal),
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
  })
  const products = useInfiniteQuery({
    queryKey: ['products', 'order-options'],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => productsApi.list(pageParam, signal),
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
  })
  const customerOptions = [
    ...new Map(
      (customers.data?.pages.flatMap((page) => page.data) ?? []).map((item) => [item.id, item]),
    ).values(),
  ]
  const productOptions = [
    ...new Map(
      (products.data?.pages.flatMap((page) => page.data) ?? []).map((item) => [item.id, item]),
    ).values(),
  ]
  const prices = new Map(productOptions.map((product) => [String(product.id), product.selling_price]))
  const total = previewTotal(
    items.map((item) => ({ price: prices.get(item.product_id) ?? '0.00', quantity: Number(item.quantity) })),
  )
  async function submit(values: OrderValues) {
    let duplicate = false
    const selected = new Set<string>()
    values.items.forEach((item, index) => {
      if (selected.has(item.product_id)) {
        setError(`items.${index}.product_id`, {
          message: 'This product is already included. Update its quantity instead.',
        })
        duplicate = true
      }
      selected.add(item.product_id)
    })
    if (duplicate) return
    await operation.run(
      'orders.create',
      () =>
        operationsApi.createOrder({
          customer_id: Number(values.customer_id),
          items: values.items.map((item) => ({
            product_id: Number(item.product_id),
            quantity: Number(item.quantity),
          })),
          notes: values.notes.trim() || null,
        }),
      (order) => {
        queryClient.setQueryData(['orders', 'detail', order.id], order)
        refreshOperations()
        navigate(`/orders/${order.id}`, { replace: true, state: { orderCreated: true } })
      },
      (error) => {
        if (error instanceof ApiError && error.kind === 'validation') {
          const allowed: FieldPath<OrderValues>[] = [
            'customer_id',
            'notes',
            'items',
            ...values.items.flatMap((_, i) => [
              `items.${i}.product_id` as const,
              `items.${i}.quantity` as const,
            ]),
          ]
          for (const name of allowed)
            if (error.fieldErrors[name]?.[0]) setError(name, { message: error.fieldErrors[name][0] })
          const first = allowed.find((name) => name !== 'items' && error.fieldErrors[name])
          if (first) setTimeout(() => setFocus(first), 0)
        }
      },
    )
  }
  return (
    <>
      <BackLink to="/orders">All orders</BackLink>
      <PageHeading
        eyebrow="Sales"
        title="New order"
        description="Build a draft, review the details, then submit it to the warehouse."
      />
      <form
        noValidate
        onSubmit={(event) => {
          void handleSubmit(submit)(event)
        }}
        className="grid items-start gap-6 xl:grid-cols-[1fr_19rem]"
      >
        <fieldset disabled={operation.pending} className="min-w-0 space-y-6">
          <Card>
            <h2 className="mb-5 font-semibold">01 / Customer</h2>
            <Select
              label="Customer"
              required
              {...register('customer_id', { required: 'Choose a customer.' })}
              error={errors.customer_id?.message}
            >
              <option value="">{customers.isPending ? 'Loading customers...' : 'Choose a customer'}</option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {!customer.is_active ? ' (inactive)' : ''}
                </option>
              ))}
            </Select>
            {customers.isError && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {errorMessage(customers.error)}{' '}
                <button type="button" className="underline" onClick={() => void customers.refetch()}>
                  Retry customers
                </button>
              </p>
            )}
            {customers.hasNextPage && (
              <Button
                className="mt-3"
                variant="secondary"
                loading={customers.isFetching}
                onClick={() => void customers.fetchNextPage()}
              >
                Load more customers
              </Button>
            )}
            {customers.isSuccess && !customerOptions.length && (
              <p className="mt-3 text-sm text-muted">Create a customer in the Customers workspace first.</p>
            )}
          </Card>
          <Card>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">02 / Order items</h2>
              <span className="text-xs text-muted">{fields.length} line items</span>
            </div>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-xl border border-line bg-canvas/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold text-muted uppercase">Item {index + 1}</p>
                    <button
                      type="button"
                      aria-label={`Remove item ${index + 1}`}
                      disabled={fields.length === 1}
                      className="rounded-lg p-2 text-danger hover:bg-danger-soft disabled:opacity-30"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
                    <Select
                      label={`Product ${index + 1}`}
                      required
                      {...register(`items.${index}.product_id`, { required: 'Choose a product.' })}
                      error={errors.items?.[index]?.product_id?.message}
                    >
                      <option value="">
                        {products.isPending ? 'Loading products...' : 'Choose a product'}
                      </option>
                      {productOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.sku} · {product.name}
                          {!product.is_active ? ' (inactive)' : ''}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label={`Quantity ${index + 1}`}
                      type="number"
                      min="1"
                      step="1"
                      required
                      {...register(`items.${index}.quantity`, {
                        validate: (value) =>
                          (Number.isSafeInteger(Number(value)) && Number(value) > 0) ||
                          'Enter a positive whole quantity.',
                      })}
                      error={errors.items?.[index]?.quantity?.message}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted">
                    <span>Unit price: {prices.get(items[index]?.product_id) ?? '—'}</span>
                    <span>
                      Line estimate:{' '}
                      <strong className="text-ink">
                        {previewTotal([
                          {
                            price: prices.get(items[index]?.product_id) ?? '0.00',
                            quantity: Number(items[index]?.quantity),
                          },
                        ])}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {products.isError && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {errorMessage(products.error)}{' '}
                <button type="button" className="underline" onClick={() => void products.refetch()}>
                  Retry products
                </button>
              </p>
            )}
            {products.isSuccess && !productOptions.length && (
              <p className="mt-3 text-sm text-muted">Create a product in the Products workspace first.</p>
            )}
            {errors.items?.message && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {errors.items.message}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => append({ product_id: '', quantity: '1' })}>
                <Plus className="size-4" />
                Add item
              </Button>
              {products.hasNextPage && (
                <Button
                  variant="secondary"
                  loading={products.isFetching}
                  onClick={() => void products.fetchNextPage()}
                >
                  Load more products
                </Button>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="mb-5 font-semibold">03 / Additional details</h2>
            <Textarea
              label="Order notes"
              maxLength={2000}
              {...register('notes', { maxLength: { value: 2000, message: 'Use at most 2000 characters.' } })}
              error={errors.notes?.message}
            />
          </Card>
        </fieldset>
        <Card className="xl:sticky xl:top-6">
          <h2 className="font-semibold">Order summary</h2>
          <p className="mt-6 text-xs text-muted uppercase">Estimated total</p>
          <p className="mt-2 break-all text-3xl font-bold tabular-nums">{total}</p>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            An estimate based on current catalog prices. Final prices and totals are calculated when the order
            is saved. Stock is deducted only after warehouse confirmation.
          </p>
          {Boolean(operation.error) && (
            <p role="alert" className="mt-5 text-sm text-danger">
              {errorMessage(operation.error)}
            </p>
          )}
          <Button
            type="submit"
            className="mt-6 w-full"
            loading={operation.pending}
            disabled={!customerOptions.length || !productOptions.length}
          >
            Create draft order
          </Button>
          <p className="mt-3 text-center text-xs text-muted">You can review the draft before submitting.</p>
        </Card>
      </form>
    </>
  )
}
