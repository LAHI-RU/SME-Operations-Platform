import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Can } from '../auth/Can'
import { can } from '../auth/permissions'
import { authStore, ApiError } from '../../lib/api'
import { queryClient } from '../../lib/query-client'
import { invalidateProductLists, productDetailQuery, productsApi } from './product-queries'
import { ProductFeedback } from './ProductFeedback'
import { catalogErrorMessage, productLinkStyle } from './product-presentation'

export function ProductDetailPage() {
  const { productId } = useParams()
  return <ProductDetail key={productId} productId={productId} />
}

function ProductDetail({ productId }: { productId: string | undefined }) {
  const id = Number(productId)
  const valid = Number.isSafeInteger(id) && id > 0
  const query = useQuery({ ...productDetailQuery(id), enabled: valid })
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const cancel = useRef<HTMLButtonElement>(null)
  const deleting = useRef(false)
  const mounted = useRef(true)
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (confirm) cancel.current?.focus()
  }, [confirm])
  async function remove() {
    if (deleting.current || !can(authStore.getSnapshot().user, 'products.delete')) return
    deleting.current = true
    setBusy(true)
    setError(undefined)
    const version = authStore.getSnapshot().sessionVersion
    try {
      await productsApi.remove(id)
      if (authStore.getSnapshot().sessionVersion !== version) return
      queryClient.removeQueries({ queryKey: ['products', 'detail', id] })
      invalidateProductLists()
      if (mounted.current) navigate('/products', { replace: true, state: { productDeleted: true } })
    } catch (failure) {
      if (mounted.current && authStore.getSnapshot().sessionVersion === version)
        setError(catalogErrorMessage(failure))
    } finally {
      deleting.current = false
      if (mounted.current) setBusy(false)
    }
  }
  if (!valid) return <ProductFeedback error={new ApiError('not_found', 'Product not found.', 404)} />
  if (query.isPending) return <ProductFeedback />
  if (query.isError) return <ProductFeedback error={query.error} retry={() => void query.refetch()} />
  const product = query.data
  return (
    <>
      <Link to="/products" className={productLinkStyle}>
        Back to products
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl break-words">{product.name}</h1>
          <p className="mt-2 text-muted">{product.sku}</p>
        </div>
        <Can capability="products.update">
          <Link to={`/products/${id}/edit`} className={productLinkStyle}>
            Edit product
          </Link>
        </Can>
      </div>
      {location.state?.productSaved === true && (
        <p role="status" className="text-success">
          Product saved.
        </p>
      )}
      <Card aria-labelledby="product-details-heading">
        <h2 id="product-details-heading" className="mb-5 font-semibold">
          Product details
        </h2>
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Category', product.category.name ?? 'Uncategorized'],
            ['Cost price', product.cost_price],
            ['Selling price', product.selling_price],
            ['Stock on hand', String(product.inventory.quantity)],
            ['Reorder level', String(product.reorder_level)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-1 font-semibold">{value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-sm text-muted">Status</dt>
            <dd className="mt-2">
              <Badge tone={product.is_active ? 'success' : 'neutral'}>
                {product.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </dd>
          </div>
        </dl>
        <p className="mt-6 whitespace-pre-wrap text-sm text-muted">
          {product.description ?? 'No description.'}
        </p>
      </Card>
      <Can capability="products.delete">
        <Card aria-labelledby="delete-product-heading">
          <h2 id="delete-product-heading" className="font-semibold">
            Delete product
          </h2>
          <p className="mt-2 text-sm text-muted">
            You can mark a product inactive instead if you want to stop using it.
          </p>
          {confirm ? (
            <div className="mt-4 space-y-4">
              <p>Delete {product.sku}? This cannot be undone.</p>
              {error && (
                <p role="alert" className="text-danger">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button ref={cancel} variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>
                  Keep product
                </Button>
                <Button variant="danger" loading={busy} onClick={() => void remove()}>
                  Confirm deletion
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" className="mt-4" onClick={() => setConfirm(true)}>
              Delete product
            </Button>
          )}
        </Card>
      </Can>
    </>
  )
}
