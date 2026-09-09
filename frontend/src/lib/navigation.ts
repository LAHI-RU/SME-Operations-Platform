import { Boxes, ClipboardList, FolderTree, LayoutDashboard, Package, PackageCheck, Palette, Truck, Users, Warehouse, type LucideIcon } from 'lucide-react'
import { matchPath } from 'react-router'

export interface NavigationItem {
  path: string
  label: string
  description: string
  icon: LucideIcon
}

// Navigation describes screens only. Authorization will use the real session later.
export const navigationGroups = [
  {
    label: 'Workspace',
    items: [
      { path: '/dashboard', label: 'Dashboard', description: 'Your operations at a glance.', icon: LayoutDashboard },
      { path: '/orders', label: 'Orders', description: 'Create and follow customer orders.', icon: ClipboardList },
      { path: '/fulfillment', label: 'Fulfillment', description: 'Coordinate picking and packing.', icon: PackageCheck },
      { path: '/delivery', label: 'Delivery', description: 'Follow dispatch and delivery progress.', icon: Truck },
    ],
  },
  {
    label: 'Catalog & stock',
    items: [
      { path: '/products', label: 'Products', description: 'Organize the products you sell.', icon: Package },
      { path: '/categories', label: 'Categories', description: 'Keep your product catalog organized.', icon: FolderTree },
      { path: '/inventory', label: 'Inventory', description: 'Review stock availability and movements.', icon: Warehouse },
    ],
  },
  {
    label: 'Contacts',
    items: [
      { path: '/customers', label: 'Customers', description: 'Manage your customer directory.', icon: Users },
      { path: '/suppliers', label: 'Suppliers', description: 'Manage your supply partners.', icon: Boxes },
    ],
  },
  {
    label: 'Preview',
    items: [
      { path: '/design-system', label: 'Design system', description: 'Review shared interface components.', icon: Palette },
    ],
  },
] satisfies { label: string; items: NavigationItem[] }[]

export const navigationItems: NavigationItem[] = navigationGroups.flatMap((group) => group.items)

export function findNavigationItem(pathname: string) {
  return navigationItems.find((item) => matchPath(item.path, pathname))
}
