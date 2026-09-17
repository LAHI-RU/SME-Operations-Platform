import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { authStore, ApiError } from '../../lib/api'
import { queryClient } from '../../lib/query-client'
import { can } from '../auth/permissions'
import { type Product, type ProductValues } from './products-api'
import { productsApi, productDetailQuery, invalidateProductLists } from './product-queries'
import { ProductFeedback } from './ProductFeedback'
import { catalogErrorMessage, productLinkStyle } from './product-presentation'

const fields: (keyof ProductValues)[] = [
  'name',
  'sku',
  'category_id',
  'cost_price',
  'selling_price',
  'reorder_level',
  'description',
  'is_active',
]
const controlStyle =
  'block min-h-11 w-full rounded-lg border border-field-border bg-surface px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
const nonnegative = (value: string) =>
  value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0

export function EditProductPage() {
  const { productId } = useParams()
  const id = Number(productId)
  const valid = Number.isSafeInteger(id) && id > 0
  const query = useQuery({ ...productDetailQuery(id), enabled: valid })
  if (!valid) return <ProductFeedback error={new ApiError('not_found', 'Product not found.', 404)} />
  if (query.isPending) return <ProductFeedback />
  if (query.isError) return <ProductFeedback error={query.error} retry={() => void query.refetch()} />
  return <ProductFormPage key={id} product={query.data} />
}

export function ProductFormPage({ product }: { product?: Product }) {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string>()
  const mounted = useRef(true)
  const saving = useRef(false)
  const feedback = useRef<HTMLParagraphElement>(null)
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ProductValues>({
    defaultValues: {
      name: product?.name ?? '',
      sku: product?.sku ?? '',
      category_id: product?.category.id?.toString() ?? '',
      description: product?.description ?? '',
      cost_price: product?.cost_price ?? '',
      selling_price: product?.selling_price ?? '',
      reorder_level: product?.reorder_level.toString() ?? '0',
      is_active: product?.is_active ?? true,
    },
  })
  const categories = useInfiniteQuery({
    queryKey: ['categories', 'product-options'],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => productsApi.categories(pageParam, signal),
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
  })
  const options = [
    ...new Map(
      (categories.data?.pages.flatMap((page) => page.data) ?? []).map((category) => [category.id, category]),
    ).values(),
  ]
  const noCategories = categories.isSuccess && options.length === 0
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (isSubmitting) return
    const first = fields.find((field) => errors[field])
    if (first) setFocus(first)
    else if (formError) feedback.current?.focus()
  }, [errors, isSubmitting, formError, setFocus])

  async function submit(values: ProductValues) {
    const session = authStore.getSnapshot()
    if (!can(session.user, product ? 'products.update' : 'products.create')) return
    setFormError(undefined)
    try {
      const saved = await productsApi.save(values, product?.id)
      if (authStore.getSnapshot().sessionVersion !== session.sessionVersion) return
      queryClient.setQueryData(['products', 'detail', saved.id], saved)
      invalidateProductLists()
      if (mounted.current) navigate(`/products/${saved.id}`, { replace: true, state: { productSaved: true } })
    } catch (error) {
      if (!mounted.current || authStore.getSnapshot().sessionVersion !== session.sessionVersion) return
      if (error instanceof ApiError && error.kind === 'validation') {
        let mapped = false
        for (const field of fields)
          if (error.fieldErrors[field]?.[0]) {
            setError(field, { type: 'server', message: error.fieldErrors[field][0] })
            mapped = true
          }
        if (!mapped) setFormError(error.message)
      } else setFormError(catalogErrorMessage(error))
    }
  }

  return (
    <>
      <Link to={product ? `/products/${product.id}` : '/products'} className={productLinkStyle}>
        Back to {product ? 'product' : 'products'}
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {product ? 'Edit product' : 'New product'}
        </h1>
        <p className="mt-3 text-muted">
          {product
            ? 'Update catalog details. Stock changes are handled separately.'
            : 'Add a product to your catalog. Initial stock will be zero.'}
        </p>
      </div>
      <Card aria-labelledby="product-form-heading">
        <h2 id="product-form-heading" className="mb-5 font-semibold">
          Catalog details
        </h2>
        <form
          noValidate
          onSubmit={async (event) => {
            event.preventDefault()
            if (saving.current) return
            saving.current = true
            try {
              await handleSubmit(submit)(event)
            } finally {
              saving.current = false
            }
          }}
        >
          <fieldset disabled={isSubmitting} className="space-y-5 disabled:opacity-70">
            <legend className="sr-only">Product fields</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Product name"
                required
                maxLength={150}
                {...register('name', {
                  required: 'Enter a product name.',
                  validate: (value) => value.trim().length > 0 || 'Enter a product name.',
                  maxLength: { value: 150, message: 'Use at most 150 characters.' },
                })}
                error={errors.name?.message}
              />
              <Input
                label="SKU"
                required
                maxLength={50}
                {...register('sku', {
                  required: 'Enter a SKU.',
                  validate: (value) => value.trim().length > 0 || 'Enter a SKU.',
                  maxLength: { value: 50, message: 'Use at most 50 characters.' },
                })}
                error={errors.sku?.message}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="product-category" className="block text-sm font-semibold">
                Category{' '}
                <span aria-hidden="true" className="text-danger">
                  *
                </span>
              </label>
              <select
                id="product-category"
                className={controlStyle}
                required
                aria-invalid={Boolean(errors.category_id)}
                aria-describedby={errors.category_id ? 'category-error' : 'category-help'}
                {...register('category_id', {
                  required: 'Choose a category.',
                  validate: (value) =>
                    (Number.isSafeInteger(Number(value)) && Number(value) > 0) || 'Choose a category.',
                })}
              >
                <option value="">Choose a category</option>
                {product?.category.id && !options.some((category) => category.id === product.category.id) && (
                  <option value={product.category.id}>
                    {product.category.name ?? `Category ${product.category.id}`}
                  </option>
                )}
                {options.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.is_active ? '' : ' (inactive)'}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p id="category-error" role="alert" className="text-sm text-danger">
                  {errors.category_id.message}
                </p>
              )}
              <p id="category-help" className="text-sm text-muted">
                {categories.isPending
                  ? 'Loading categories...'
                  : noCategories
                    ? 'A category is required. Add one in Categories, or contact your administrator.'
                    : `${options.length} categories loaded. Load more if yours is not listed.`}
              </p>
              {categories.isError && (
                <p role="alert" className="text-sm text-danger">
                  {catalogErrorMessage(categories.error)}
                </p>
              )}
              {categories.isError && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    void (categories.isFetchNextPageError ? categories.fetchNextPage() : categories.refetch())
                  }
                >
                  Retry categories
                </Button>
              )}
              {categories.hasNextPage && (
                <Button
                  variant="secondary"
                  loading={categories.isFetching}
                  onClick={() => void categories.fetchNextPage()}
                >
                  Load more categories
                </Button>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Input
                label="Cost price"
                type="number"
                step="any"
                min="0"
                required
                {...register('cost_price', {
                  validate: (value) => nonnegative(value) || 'Enter a non-negative cost price.',
                })}
                error={errors.cost_price?.message}
              />
              <Input
                label="Selling price"
                type="number"
                step="any"
                min="0"
                required
                {...register('selling_price', {
                  validate: (value) => nonnegative(value) || 'Enter a non-negative selling price.',
                })}
                error={errors.selling_price?.message}
              />
              <Input
                label="Reorder level"
                type="number"
                step="1"
                min="0"
                required
                {...register('reorder_level', {
                  validate: (value) =>
                    (nonnegative(value) && Number.isSafeInteger(Number(value))) ||
                    'Enter a non-negative whole number.',
                })}
                error={errors.reorder_level?.message}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="product-description" className="block text-sm font-semibold">
                Description
              </label>
              <textarea
                id="product-description"
                rows={4}
                maxLength={2000}
                className={controlStyle}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? 'description-error' : undefined}
                {...register('description', {
                  maxLength: { value: 2000, message: 'Use at most 2000 characters.' },
                })}
              />
              {errors.description && (
                <p id="description-error" role="alert" className="text-sm text-danger">
                  {errors.description.message}
                </p>
              )}
            </div>
            {product && (
              <div>
                <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
                  <input type="checkbox" className="size-5 accent-brand" {...register('is_active')} />
                  Active product
                </label>
                {errors.is_active && (
                  <p role="alert" className="text-sm text-danger">
                    {errors.is_active.message}
                  </p>
                )}
              </div>
            )}
          </fieldset>
          {formError && (
            <p ref={feedback} tabIndex={-1} role="alert" className="mt-5 text-danger">
              {formError}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-4">
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={categories.isPending || (!product && (noCategories || !categories.data))}
            >
              {product ? 'Save changes' : 'Create product'}
            </Button>
            {!isSubmitting && (
              <Link to={product ? `/products/${product.id}` : '/products'} className={productLinkStyle}>
                Cancel
              </Link>
            )}
          </div>
        </form>
      </Card>
    </>
  )
}
