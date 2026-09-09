import type { BadgeTone } from '../components/ui/Badge'
import type { OrderStatus } from '../types/order'

export const orderStatusPresentation = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SUBMITTED: { label: 'Submitted', tone: 'info' },
  PENDING_STOCK: { label: 'Pending stock', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  PACKING: { label: 'Packing', tone: 'info' },
  READY_FOR_DELIVERY: { label: 'Ready for delivery', tone: 'info' },
  ASSIGNED: { label: 'Assigned', tone: 'info' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'info' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
} satisfies Record<OrderStatus, { label: string; tone: BadgeTone }>
