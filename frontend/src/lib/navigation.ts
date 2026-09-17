import {
  Boxes,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  Package,
  PackageCheck,
  Palette,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { matchPath } from 'react-router'
import type { AuthUser } from '../features/auth/auth-api'
import { can, type Capability } from '../features/auth/permissions'

export interface NavigationItem {
  path: string
  label: string
  description: string
  icon: LucideIcon
  capability: Capability
  actions: { label: string; capability: Capability }[]
}

// A single capability controls page entry and both navigation surfaces.
export const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      {
        path: '/dashboard',
        label: 'Dashboard',
        description: 'Your operations at a glance.',
        icon: LayoutDashboard,
        capability: 'workspace.view',
        actions: [],
      },
      {
        path: '/orders',
        label: 'Orders',
        description: 'Create and follow customer orders.',
        icon: ClipboardList,
        capability: 'orders.view',
        actions: [
          { label: 'Create orders', capability: 'orders.create' },
          { label: 'Submit orders', capability: 'orders.submit' },
          { label: 'Confirm orders', capability: 'orders.confirm' },
        ],
      },
      {
        path: '/fulfillment',
        label: 'Fulfillment',
        description: 'Coordinate picking and packing.',
        icon: PackageCheck,
        capability: 'fulfillment.start',
        actions: [
          { label: 'Start fulfillment', capability: 'fulfillment.start' },
          { label: 'Complete fulfillment', capability: 'fulfillment.complete' },
        ],
      },
      {
        path: '/delivery',
        label: 'Delivery',
        description: 'Follow dispatch and delivery progress.',
        icon: Truck,
        capability: 'delivery.view',
        actions: [
          { label: 'Assign delivery', capability: 'delivery.assign' },
          { label: 'Start delivery', capability: 'delivery.start' },
          { label: 'Complete delivery', capability: 'delivery.complete' },
        ],
      },
    ],
  },
  {
    label: 'Catalog & stock',
    items: [
      {
        path: '/products',
        label: 'Products',
        description: 'Organize the products you sell.',
        icon: Package,
        capability: 'products.view',
        actions: [
          { label: 'Create products', capability: 'products.create' },
          { label: 'Update products', capability: 'products.update' },
          { label: 'Delete products', capability: 'products.delete' },
        ],
      },
      {
        path: '/categories',
        label: 'Categories',
        description: 'Keep your product catalog organized.',
        icon: FolderTree,
        capability: 'categories.view',
        actions: [
          { label: 'Create categories', capability: 'categories.create' },
          { label: 'Update categories', capability: 'categories.update' },
          { label: 'Delete categories', capability: 'categories.delete' },
        ],
      },
      {
        path: '/inventory',
        label: 'Inventory',
        description: 'Review stock availability and movements.',
        icon: Warehouse,
        capability: 'inventory.view',
        actions: [
          { label: 'Stock in', capability: 'inventory.stockIn' },
          { label: 'Stock out', capability: 'inventory.stockOut' },
        ],
      },
    ],
  },
  {
    label: 'Contacts',
    items: [
      {
        path: '/customers',
        label: 'Customers',
        description: 'Manage your customer directory.',
        icon: Users,
        capability: 'customers.view',
        actions: [
          { label: 'Create customers', capability: 'customers.create' },
          { label: 'Update customers', capability: 'customers.update' },
          { label: 'Delete customers', capability: 'customers.delete' },
        ],
      },
      {
        path: '/suppliers',
        label: 'Suppliers',
        description: 'Manage your supply partners.',
        icon: Boxes,
        capability: 'suppliers.view',
        actions: [
          { label: 'Create suppliers', capability: 'suppliers.create' },
          { label: 'Update suppliers', capability: 'suppliers.update' },
          { label: 'Delete suppliers', capability: 'suppliers.delete' },
        ],
      },
    ],
  },
  {
    label: 'Resources',
    items: [
      {
        path: '/design-system',
        label: 'Design system',
        description: 'Review shared interface components.',
        icon: Palette,
        capability: 'workspace.view',
        actions: [],
      },
    ],
  },
]

export const navigationItems: NavigationItem[] = navigationGroups.flatMap((group) => group.items)

export function findNavigationItem(pathname: string) {
  const product = navigationItems.find((item) => item.path === '/products')!
  if (matchPath('/products/new', pathname))
    return { ...product, label: 'New product', capability: 'products.create' as const }
  if (matchPath('/products/:productId/edit', pathname))
    return { ...product, label: 'Edit product', capability: 'products.update' as const }
  if (matchPath('/products/:productId', pathname)) return { ...product, label: 'Product details' }
  for (const kind of ['categories', 'customers', 'suppliers', 'orders', 'inventory'] as const) {
    const item = navigationItems.find((item) => item.path === '/' + kind)!
    const singular =
      kind === 'categories' ? 'category' : kind === 'inventory' ? 'inventory' : kind.slice(0, -1)
    if (kind !== 'inventory' && matchPath('/' + kind + '/new', pathname))
      return { ...item, label: 'New ' + singular, capability: (kind + '.create') as Capability }
    if (!['inventory', 'orders'].includes(kind) && matchPath('/' + kind + '/:id/edit', pathname))
      return { ...item, label: 'Edit ' + singular, capability: (kind + '.update') as Capability }
    if (matchPath('/' + kind + '/:id', pathname))
      return { ...item, label: singular[0].toUpperCase() + singular.slice(1) + ' details' }
  }
  return navigationItems.find((item) => matchPath(item.path, pathname))
}

export function visibleNavigationGroups(user: Pick<AuthUser, 'role'> | null | undefined) {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(user, item.capability)),
    }))
    .filter((group) => group.items.length > 0)
}
