import type { OrderStatus } from '../../types/order'
import type { Capability } from '../auth/permissions'
import type { OrderAction } from '../operations/api'
export const workflowActions: Partial<
  Record<
    OrderStatus,
    {
      action: OrderAction
      capability: Capability
      label: string
      description: string
      notes?: boolean
      assignment?: boolean
    }
  >
> = {
  DRAFT: {
    action: 'submit',
    capability: 'orders.submit',
    label: 'Submit order',
    description: 'Send this draft to the warehouse for stock confirmation.',
  },
  SUBMITTED: {
    action: 'confirm',
    capability: 'orders.confirm',
    label: 'Confirm stock',
    description:
      'Check stock for every item. Available stock is deducted atomically; insufficient stock moves the order to Pending stock.',
  },
  CONFIRMED: {
    action: 'fulfillment/start',
    capability: 'fulfillment.start',
    label: 'Start fulfillment',
    description: 'Begin picking and packing this confirmed order.',
  },
  PACKING: {
    action: 'fulfillment/complete',
    capability: 'fulfillment.complete',
    label: 'Complete fulfillment',
    description: 'Confirm that all items are packed and ready for dispatch.',
    notes: true,
  },
  READY_FOR_DELIVERY: {
    action: 'delivery/assign',
    capability: 'delivery.assign',
    label: 'Assign delivery',
    description: 'Assign this order to an existing delivery user.',
    assignment: true,
  },
  ASSIGNED: {
    action: 'delivery/start',
    capability: 'delivery.start',
    label: 'Start delivery',
    description: 'Mark this order as dispatched and out for delivery.',
  },
  OUT_FOR_DELIVERY: {
    action: 'delivery/complete',
    capability: 'delivery.complete',
    label: 'Complete delivery',
    description: 'Confirm that this order has reached the customer.',
    notes: true,
  },
}
export const workflowStages = [
  'DRAFT',
  'SUBMITTED',
  'CONFIRMED',
  'PACKING',
  'READY_FOR_DELIVERY',
  'ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const
