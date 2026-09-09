// Values from backend/app/Enums/OrderStatus.php. Presentation only; no transitions.
export const ORDER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_STOCK',
  'CONFIRMED',
  'PACKING',
  'READY_FOR_DELIVERY',
  'ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const

export type OrderStatus = typeof ORDER_STATUSES[number]
