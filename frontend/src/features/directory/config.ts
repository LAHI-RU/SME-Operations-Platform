import type { DirectoryKind, DirectoryRecord } from '../operations/api'
export interface DirectoryField {
  name: string
  label: string
  required?: boolean
  max: number
  type?: 'email' | 'tel' | 'textarea'
}
const contactFields: DirectoryField[] = [
  { name: 'name', label: 'Name', required: true, max: 150 },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, max: 30 },
  { name: 'email', label: 'Email address', type: 'email', max: 255 },
  { name: 'address', label: 'Address', type: 'textarea', max: 2000 },
]
export const directoryConfig: Record<
  DirectoryKind,
  { singular: string; title: string; description: string; fields: DirectoryField[] }
> = {
  categories: {
    singular: 'category',
    title: 'Categories',
    description: 'A clear structure for every product in your catalog.',
    fields: [
      { name: 'name', label: 'Category name', required: true, max: 100 },
      { name: 'description', label: 'Description', type: 'textarea', max: 1000 },
    ],
  },
  customers: {
    singular: 'customer',
    title: 'Customers',
    description: 'Customer contacts, organized and ready for the next order.',
    fields: contactFields,
  },
  suppliers: {
    singular: 'supplier',
    title: 'Suppliers',
    description: 'The people and businesses behind your supply chain.',
    fields: [
      contactFields[0],
      { name: 'contact_person', label: 'Contact person', max: 150 },
      ...contactFields.slice(1),
    ],
  },
}
export function recordValue(record: DirectoryRecord, field: string) {
  const value = (record as unknown as Record<string, unknown>)[field]
  return typeof value === 'string' ? value : ''
}
export function directoryPayload(
  kind: DirectoryKind,
  values: Record<string, string | boolean>,
  edit: boolean,
) {
  return {
    ...Object.fromEntries(
      directoryConfig[kind].fields.map((field) => [
        field.name,
        String(values[field.name] ?? '').trim() || (field.required ? '' : null),
      ]),
    ),
    ...(edit ? { is_active: Boolean(values.is_active) } : {}),
  }
}
