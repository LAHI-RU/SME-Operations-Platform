<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\DeliveryStatus;
use App\Enums\OrderStatus;
use App\Exceptions\BusinessConflictException;
use App\Models\Delivery;
use App\Models\SalesOrder;
use Illuminate\Support\Facades\DB;

class DeliveryService
{
    public function __construct(
        private readonly SalesOrderStatusService $statusService,
    ) {}

    public function assign(
        SalesOrder $salesOrder,
        int $assignedTo,
        int $changedBy,
    ): Delivery {
        return DB::transaction(function () use (
            $salesOrder,
            $assignedTo,
            $changedBy,
        ) {
            $order = SalesOrder::query()
                ->whereKey($salesOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            $existingDelivery = Delivery::query()
                ->where('sales_order_id', $order->id)
                ->lockForUpdate()
                ->first();

            if ($existingDelivery) {
                throw new BusinessConflictException(
                    'Delivery has already been assigned.'
                );
            }

            if ($order->status !== OrderStatus::READY_FOR_DELIVERY) {
                throw new BusinessConflictException(
                    'Only orders ready for delivery can be assigned.'
                );
            }

            $delivery = Delivery::query()->create([
                'sales_order_id' => $order->id,
                'status' => DeliveryStatus::ASSIGNED,
                'assigned_to' => $assignedTo,
                'assigned_at' => now(),
            ]);

            $this->statusService->transition(
                salesOrder: $order,
                toStatus: OrderStatus::ASSIGNED,
                changedBy: $changedBy,
                reason: 'Delivery assigned.',
            );

            return $delivery->refresh();
        });
    }

    public function start(
        SalesOrder $salesOrder,
        int $changedBy,
    ): Delivery {
        return DB::transaction(function () use (
            $salesOrder,
            $changedBy,
        ) {
            $order = SalesOrder::query()
                ->whereKey($salesOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            $delivery = Delivery::query()
                ->where('sales_order_id', $order->id)
                ->lockForUpdate()
                ->first();

            if (! $delivery) {
                throw new BusinessConflictException(
                    'Delivery has not been assigned.'
                );
            }

            if ($delivery->status !== DeliveryStatus::ASSIGNED) {
                throw new BusinessConflictException(
                    'Only assigned deliveries can start.'
                );
            }

            if ($order->status !== OrderStatus::ASSIGNED) {
                throw new BusinessConflictException(
                    'Only assigned orders can start delivery.'
                );
            }

            $delivery->update([
                'status' => DeliveryStatus::OUT_FOR_DELIVERY,
                'out_for_delivery_at' => now(),
            ]);

            $this->statusService->transition(
                salesOrder: $order,
                toStatus: OrderStatus::OUT_FOR_DELIVERY,
                changedBy: $changedBy,
                reason: 'Order is out for delivery.',
            );

            return $delivery->refresh();
        });
    }

    public function complete(
        SalesOrder $salesOrder,
        int $changedBy,
        ?string $notes = null,
    ): Delivery {
        return DB::transaction(function () use (
            $salesOrder,
            $changedBy,
            $notes,
        ) {
            $order = SalesOrder::query()
                ->whereKey($salesOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            $delivery = Delivery::query()
                ->where('sales_order_id', $order->id)
                ->lockForUpdate()
                ->first();

            if (! $delivery) {
                throw new BusinessConflictException(
                    'Delivery has not been assigned.'
                );
            }

            if ($delivery->status !== DeliveryStatus::OUT_FOR_DELIVERY) {
                throw new BusinessConflictException(
                    'Only deliveries currently out for delivery can be completed.'
                );
            }

            if ($order->status !== OrderStatus::OUT_FOR_DELIVERY) {
                throw new BusinessConflictException(
                    'Only orders out for delivery can be completed.'
                );
            }

            $delivery->update([
                'status' => DeliveryStatus::DELIVERED,
                'delivered_at' => now(),
                'notes' => $notes,
            ]);

            $this->statusService->transition(
                salesOrder: $order,
                toStatus: OrderStatus::DELIVERED,
                changedBy: $changedBy,
                reason: 'Order delivered successfully.',
            );

            return $delivery->refresh();
        });
    }
}
