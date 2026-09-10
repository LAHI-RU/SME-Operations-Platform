import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Can } from '../auth/Can'
import { productsApi } from './product-queries'
import { ProductFeedback } from './ProductFeedback'
import { productLinkStyle } from './product-presentation'

export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const requestedPage = Number(params.get('page') ?? 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const query = useQuery({ queryKey: ['products', 'list', page], queryFn: ({ signal }) => productsApi.list(page, signal) })
  return <>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Products</h1><p className="mt-3 text-muted">Your catalog, prices, and current stock. Newest products first.</p></div><Can capability="products.create"><Link to="/products/new" className={productLinkStyle}>New product</Link></Can></div>
    {location.state?.productDeleted === true && <p role="status" className="text-success">Product deleted.</p>}
    {query.isPending ? <ProductFeedback /> : query.isError ? <ProductFeedback error={query.error} retry={() => void query.refetch()} /> : <Card aria-labelledby="catalog-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="catalog-heading" className="font-semibold">{query.data.meta.total.toLocaleString()} products</h2><Button variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>Refresh products</Button></div>
      {query.data.data.length === 0 ? <p className="py-8 text-center text-muted">{query.data.meta.total === 0 ? 'No products yet.' : 'No products on this page. Choose an earlier page.'}</p> : <div role="region" aria-label="Products table" tabIndex={0} className="overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-brand">
        <table className="w-full text-left text-sm"><caption className="sr-only">Product catalog</caption><thead className="border-b border-line text-xs text-muted"><tr>{['Product', 'Category', 'Selling price', 'Stock', 'Active', ''].map((label, i) => <th key={i} scope="col" className="px-3 py-3">{label || <span className="sr-only">Details</span>}</th>)}</tr></thead><tbody>{query.data.data.map((product) => <tr key={product.id} className="border-b border-line last:border-0">
          <th scope="row" className="max-w-72 px-3 py-4"><Link to={`/products/${product.id}`} className={productLinkStyle}>{product.name}</Link><p className="font-normal text-muted">{product.sku}</p></th><td className="px-3 py-4">{product.category.name ?? 'Uncategorized'}</td><td className="px-3 py-4 tabular-nums">{product.selling_price}</td><td className="px-3 py-4 tabular-nums">{product.inventory.quantity}</td><td className="px-3 py-4"><Badge tone={product.is_active ? 'success' : 'neutral'}>{product.is_active ? 'Active' : 'Inactive'}</Badge></td><td className="px-3 py-4"><Link aria-label={`View ${product.sku}`} to={`/products/${product.id}`} className={productLinkStyle}>View</Link></td>
        </tr>)}</tbody></table>
      </div>}
      <nav aria-label="Product pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"><p className="text-sm text-muted">Page {page} of {query.data.meta.last_page}</p><div className="flex gap-3"><Button variant="secondary" disabled={page <= 1 || query.isFetching} onClick={() => setParams({ page: String(Math.min(page - 1, query.data.meta.last_page)) })}>Previous</Button><Button variant="secondary" disabled={page >= query.data.meta.last_page || query.isFetching} onClick={() => setParams({ page: String(page + 1) })}>Next</Button></div></nav>
    </Card>}
  </>
}
