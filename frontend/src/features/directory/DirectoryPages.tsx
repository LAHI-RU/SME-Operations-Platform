import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Plus, RefreshCw, Pencil } from 'lucide-react'
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
  Textarea,
} from '../../components/ui/Workspace'
import { Can } from '../auth/Can'
import { ApiError } from '../../lib/api'
import { queryClient } from '../../lib/query-client'
import { operationsApi, type DirectoryKind, type DirectoryRecord } from '../operations/api'
import { useOperation } from '../operations/use-operation'
import { displayDate, errorMessage, humanize, linkStyle, pageNumber, validId } from '../operations/helpers'
import { directoryConfig, directoryPayload, recordValue } from './config'

function refreshDirectory(kind: DirectoryKind) {
  void queryClient.invalidateQueries({ queryKey: [kind] })
  void queryClient.invalidateQueries({ queryKey: ['products'] })
}
const detailQuery = (kind: DirectoryKind, id: number) => ({
  queryKey: [kind, 'detail', id],
  queryFn: ({ signal }: { signal: AbortSignal }) => operationsApi.directoryDetail(kind, id, signal),
})

export function DirectoryList({ kind }: { kind: DirectoryKind }) {
  const config = directoryConfig[kind]
  const [params, setParams] = useSearchParams()
  const page = pageNumber(params.get('page'))
  const query = useQuery({
    queryKey: [kind, 'list', page],
    queryFn: ({ signal }) => operationsApi.directoryList(kind, page, signal),
  })
  return (
    <>
      <PageHeading
        eyebrow={kind === 'categories' ? 'Catalog' : 'Relationships'}
        title={config.title}
        description={config.description}
      >
        <Can capability={`${kind}.create`}>
          <Link className="button-link" to={`/${kind}/new`}>
            <Plus className="size-4" />
            New {config.singular}
          </Link>
        </Can>
      </PageHeading>
      {query.isPending || query.isError ? (
        <RequestState error={query.error} paused={query.isPaused} retry={() => void query.refetch()} />
      ) : (
        <Card>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-semibold">
              {query.data.meta.total.toLocaleString()} {config.title.toLowerCase()}
            </h2>
            <Button variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>
              <RefreshCw aria-hidden="true" className="size-4" />
              Refresh
            </Button>
          </div>
          {!query.data.data.length ? (
            <EmptyState
              title={query.data.meta.total ? 'No records on this page' : `No ${kind} yet`}
              description={
                query.data.meta.total
                  ? 'Use Previous to return to an earlier page.'
                  : `Add your first ${config.singular} to get started.`
              }
            />
          ) : (
            <DataTable
              label={config.title}
              headings={['Name', kind === 'categories' ? 'Description' : 'Contact', 'Status', 'Details']}
            >
              {query.data.data.map((record) => (
                <tr key={record.id}>
                  <th scope="row">
                    <Link className={linkStyle} to={`/${kind}/${record.id}`}>
                      {record.name}
                    </Link>
                    {kind !== 'categories' && (
                      <p className="text-xs font-normal text-muted">
                        {recordValue(record, kind === 'customers' ? 'customer_code' : 'supplier_code')}
                      </p>
                    )}
                  </th>
                  <td className="max-w-sm whitespace-pre-wrap break-words">
                    {kind === 'categories' ? (
                      recordValue(record, 'description') || 'No description'
                    ) : (
                      <>
                        <p>{recordValue(record, 'phone')}</p>
                        <p className="text-xs text-muted">
                          {recordValue(record, 'email') || 'No email address'}
                        </p>
                      </>
                    )}
                  </td>
                  <td>
                    <Badge tone={record.is_active ? 'success' : 'neutral'}>
                      {record.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <Link
                      className={linkStyle}
                      to={`/${kind}/${record.id}`}
                      aria-label={`View ${record.name}`}
                    >
                      View
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

export function DirectoryDetail({ kind, edit = false }: { kind: DirectoryKind; edit?: boolean }) {
  const { recordId } = useParams()
  const query = useQuery({ ...detailQuery(kind, Number(recordId)), enabled: validId(recordId) })
  if (!validId(recordId)) return <RequestState error={new ApiError('not_found', 'Record not found.')} />
  if (query.isPending || query.isError)
    return <RequestState error={query.error} paused={query.isPaused} retry={() => void query.refetch()} />
  return edit ? (
    <DirectoryForm key={`${kind}-${recordId}`} kind={kind} record={query.data} />
  ) : (
    <DirectoryRecordPage key={`${kind}-${recordId}`} kind={kind} record={query.data} />
  )
}

function DirectoryRecordPage({ kind, record }: { kind: DirectoryKind; record: DirectoryRecord }) {
  const config = directoryConfig[kind]
  const [confirm, setConfirm] = useState(false)
  const operation = useOperation()
  const navigate = useNavigate()
  return (
    <>
      <BackLink to={`/${kind}`}>All {kind}</BackLink>
      <PageHeading
        eyebrow={humanize(config.singular)}
        title={record.name}
        description={
          recordValue(record, kind === 'customers' ? 'customer_code' : 'supplier_code') ||
          'Organized catalog information'
        }
      >
        <Can capability={`${kind}.update`}>
          <Link className="button-link-secondary" to={`/${kind}/${record.id}/edit`}>
            <Pencil className="size-4" />
            Edit {config.singular}
          </Link>
        </Can>
      </PageHeading>
      <Card>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-semibold">{humanize(config.singular)} details</h2>
          <Badge tone={record.is_active ? 'success' : 'neutral'}>
            {record.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <dl className="grid gap-6 sm:grid-cols-2">
          {config.fields.map((field) => (
            <div key={field.name}>
              <dt className="text-xs font-semibold text-muted uppercase">{field.label}</dt>
              <dd className="mt-2 whitespace-pre-wrap break-words text-sm">
                {recordValue(record, field.name) || 'Not provided'}
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-xs font-semibold text-muted uppercase">Last updated</dt>
            <dd className="mt-2 text-sm">{displayDate(record.updated_at)}</dd>
          </div>
        </dl>
      </Card>
      {kind === 'customers' && (
        <Link className={linkStyle} to={`/orders?customer_id=${record.id}`}>
          View customer orders →
        </Link>
      )}
      <Can capability={`${kind}.delete`}>
        <Card className="border-danger/20">
          <h2 className="font-semibold">Delete {config.singular}</h2>
          <p className="mt-2 text-sm text-muted">
            Permanently remove this record. You can mark it inactive in Edit instead.
          </p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => {
              operation.clearError()
              setConfirm(true)
            }}
          >
            Delete {config.singular}
          </Button>
        </Card>
      </Can>
      {confirm && (
        <ConfirmDialog
          title={`Delete ${config.singular}?`}
          destructive
          pending={operation.pending}
          error={operation.error}
          onCancel={() => setConfirm(false)}
          onConfirm={() =>
            void operation.run(
              `${kind}.delete`,
              () => operationsApi.directoryDelete(kind, record.id),
              () => {
                queryClient.removeQueries({ queryKey: [kind, 'detail', record.id] })
                refreshDirectory(kind)
                navigate(`/${kind}`, { replace: true })
              },
            )
          }
        >
          “{record.name}” will be permanently removed. Related records may prevent deletion.
        </ConfirmDialog>
      )}
    </>
  )
}

export function DirectoryForm({ kind, record }: { kind: DirectoryKind; record?: DirectoryRecord }) {
  const config = directoryConfig[kind]
  const navigate = useNavigate()
  const operation = useOperation()
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<Record<string, string | boolean>>({
    defaultValues: {
      ...Object.fromEntries(
        config.fields.map((field) => [field.name, record ? recordValue(record, field.name) : '']),
      ),
      is_active: record?.is_active ?? true,
    },
  })
  return (
    <>
      <BackLink to={`/${kind}${record ? `/${record.id}` : ''}`}>
        Back to {record ? config.singular : kind}
      </BackLink>
      <PageHeading
        eyebrow={config.title}
        title={`${record ? 'Edit' : 'New'} ${config.singular}`}
        description={`Keep your ${config.singular} information accurate and easy to find.`}
      />
      <Card className="max-w-3xl">
        <form
          noValidate
          onSubmit={(event) => {
            void handleSubmit((values) =>
              operation.run(
                `${kind}.${record ? 'update' : 'create'}`,
                () =>
                  operationsApi.directorySave(
                    kind,
                    directoryPayload(kind, values, Boolean(record)),
                    record?.id,
                  ),
                (saved) => {
                  queryClient.setQueryData([kind, 'detail', saved.id], saved)
                  refreshDirectory(kind)
                  navigate(`/${kind}/${saved.id}`, { replace: true })
                },
                (error) => {
                  if (error instanceof ApiError && error.kind === 'validation') {
                    const keys = [...config.fields.map((field) => field.name), 'is_active']
                    for (const key of keys)
                      if (error.fieldErrors[key]?.[0]) setError(key, { message: error.fieldErrors[key][0] })
                    const first = keys.find((key) => error.fieldErrors[key])
                    if (first) setTimeout(() => setFocus(first), 0)
                  }
                },
              ),
            )(event)
          }}
        >
          <fieldset disabled={operation.pending} className="space-y-5">
            <legend className="mb-5 font-semibold">Basic information</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              {config.fields.map((field) => {
                const rules = {
                  required: field.required ? `Enter ${field.label.toLowerCase()}.` : false,
                  maxLength: { value: field.max, message: `Use at most ${field.max} characters.` },
                  validate: (value: string | boolean) =>
                    field.required && !String(value).trim()
                      ? `Enter ${field.label.toLowerCase()}.`
                      : field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
                        ? 'Enter a valid email address.'
                        : true,
                }
                return (
                  <div className={field.type === 'textarea' ? 'sm:col-span-2' : ''} key={field.name}>
                    {field.type === 'textarea' ? (
                      <Textarea
                        label={field.label}
                        maxLength={field.max}
                        {...register(field.name, rules)}
                        error={errors[field.name]?.message}
                      />
                    ) : (
                      <Input
                        label={field.label}
                        type={field.type ?? 'text'}
                        required={field.required}
                        maxLength={field.max}
                        {...register(field.name, rules)}
                        error={errors[field.name]?.message}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            {record && (
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
                <input type="checkbox" className="size-5 accent-brand" {...register('is_active')} />
                Active {config.singular}
              </label>
            )}
          </fieldset>
          {Boolean(operation.error) && (
            <p role="alert" className="mt-5 text-sm text-danger">
              {errorMessage(operation.error)}
            </p>
          )}
          <div className="mt-7 flex items-center gap-4 border-t border-line pt-5">
            <Button type="submit" loading={operation.pending}>
              {record ? 'Save changes' : `Create ${config.singular}`}
            </Button>
            <Link className={linkStyle} to={`/${kind}${record ? `/${record.id}` : ''}`}>
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </>
  )
}
