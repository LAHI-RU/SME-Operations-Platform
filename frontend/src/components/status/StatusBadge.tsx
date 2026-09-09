import { orderStatusPresentation } from '../../lib/order-status'
import type { OrderStatus } from '../../types/order'
import { Badge } from '../ui/Badge'

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone } = orderStatusPresentation[status]

  return <Badge tone={tone}>{label}</Badge>
}
