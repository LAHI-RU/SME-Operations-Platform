<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\SalesOrder;
use App\Models\SalesOrderStatusHistory;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SalesOrderStatusService
{
    /**
     * @var array<string, list<OrderStatus>>
     */
    private const ALLOWED_TRANSITIONS = [
        'DRAFT' => [
            OrderStatus::SUBMITTED,
            OrderStatus::CANCELLED,
        ],

        'SUBMITTED' => [
            OrderStatus::CONFIRMED,
            OrderStatus::PENDING_STOCK,
            OrderStatus::CANCELLED,
        ],

        'PENDING_STOCK' => [
            OrderStatus::CONFIRMED,
            OrderStatus::CANCELLED,
        ],

        'CONFIRMED' => [
            OrderStatus::PACKING,
            OrderStatus::CANCELLED,
        ],

        'PACKING' => [
            OrderStatus::READY_FOR_DELIVERY,
        ],

        'READY_FOR_DELIVERY' => [
            OrderStatus::ASSIGNED,
        ],

        'ASSIGNED' => [
            OrderStatus::OUT_FOR_DELIVERY,
        ],

        'OUT_FOR_DELIVERY' => [
            OrderStatus::DELIVERED,
        ],

        'DELIVERED' => [],

        'CANCELLED' => [],
    ];

    public function transition(
        SalesOrder $salesOrder,
        OrderStatus $toStatus,
        int $changedBy,
        ?string $reason = null,
    ): SalesOrder {
        return DB::transaction(function () use (
            $salesOrder,
            $toStatus,
            $changedBy,
            $reason,
        ): SalesOrder {
            $order = SalesOrder::query()
                ->whereKey($salesOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            $fromStatus = $order->status;

            if ($fromStatus === $toStatus) {
                throw new InvalidArgumentException(
                    'The order is already in this status.'
                );
            }

            $allowedStatuses = self::ALLOWED_TRANSITIONS[
                $fromStatus->value
            ] ?? [];

            if (! in_array($toStatus, $allowedStatuses, true)) {
                throw new InvalidArgumentException(
                    "Invalid order status transition: {$fromStatus->value} → {$toStatus->value}."
                );
            }

            $order->update([
                'status' => $toStatus,
            ]);

            SalesOrderStatusHistory::query()->create([
                'sales_order_id' => $order->id,
                'from_status' => $fromStatus->value,
                'to_status' => $toStatus->value,
                'changed_by' => $changedBy,
                'reason' => $reason,
            ]);

            return $order->refresh();
        });
    }
}
