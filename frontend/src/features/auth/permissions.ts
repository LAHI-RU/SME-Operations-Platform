import { USER_ROLES, type AuthUser, type UserRole } from './auth-api'

const admin = ['ADMIN'] as const
const sales = ['ADMIN', 'SALES'] as const
const warehouse = ['ADMIN', 'WAREHOUSE'] as const
const delivery = ['ADMIN', 'DELIVERY'] as const

// Mirrors the role checks in backend/app/Policies. This is UI guidance, not security
// or a substitute for record-state/ownership checks when business actions are built.
const capabilityRoles = {
  'workspace.view': USER_ROLES, // Local dashboard and component preview.
  'categories.view': USER_ROLES,
  'categories.create': admin,
  'categories.update': admin,
  'categories.delete': admin,
  'products.view': USER_ROLES,
  'products.create': warehouse,
  'products.update': warehouse,
  'products.delete': admin,
  'customers.view': USER_ROLES,
  'customers.create': sales,
  'customers.update': sales,
  'customers.delete': admin,
  'suppliers.view': USER_ROLES,
  'suppliers.create': warehouse,
  'suppliers.update': warehouse,
  'suppliers.delete': admin,
  'inventory.view': USER_ROLES,
  'inventory.transactions': USER_ROLES,
  'inventory.stockIn': warehouse,
  'inventory.stockOut': warehouse,
  'orders.view': USER_ROLES,
  'orders.create': sales,
  'orders.submit': sales,
  'orders.confirm': warehouse,
  'fulfillment.start': warehouse,
  'fulfillment.complete': warehouse,
  'delivery.view': USER_ROLES,
  'delivery.assign': sales,
  'delivery.start': delivery,
  'delivery.complete': delivery,
} satisfies Record<string, readonly UserRole[]>

export type Capability = keyof typeof capabilityRoles

export function can(user: Pick<AuthUser, 'role'> | null | undefined, capability: Capability): boolean {
  if (!user || !Object.hasOwn(capabilityRoles, capability)) return false
  const roles: readonly UserRole[] = capabilityRoles[capability]
  return roles.includes(user.role)
}
