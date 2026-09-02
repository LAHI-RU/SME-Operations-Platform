<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\FulfillmentStatus;
use App\Enums\OrderStatus;
use App\Models\Fulfillment;
use App\Models\SalesOrder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class FulfillmentService
{
    public function start(
        SalesOrder $salesOrder,
        int $packedBy,
    ): Fulfillment {
        return DB::transaction(function () use (
            $salesOrder,
            $packedBy,
        ): Fulfillment {
            $order = SalesOrder::query()
                ->whereKey($salesOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            /*
                   * Check whether fulfillment already exists first.
                   * This gives a more accurate business error for retries.
                   */
            $existingFulfillment = Fulfillment::query()
                ->where('sales_order_id', $order->id)
                ->lockForUpdate()
                ->first();

            if ($existingFulfillment) {
                throw new RuntimeException(
                    'Fulfillment has already been started for this order.'
                );
            }

            if ($order->status !== OrderStatus::CONFIRMED) {
                throw new RuntimeException(
                    'Only confirmed orders can start fulfillment.'
                );
            }

            $fulfillment = Fulfillment::query()->create([
                'sales_order_id' => $order->id,
                'status' => FulfillmentStatus::IN_PROGRESS,
                'started_at' => now(),
                'packed_by' => $packedBy,
            ]);

            $order->update([
                'status' => OrderStatus::PACKING,
            ]);

            return $fulfillment;
        });
    }

    public function complete(
        SalesOrder $salesOrder,
        ?string $notes = null,
    ): Fulfillment {
        return DB::transaction(function () use ($salesOrder, $notes) {
            $order = SalesOrder::query()
                ->whereKey($salesOrder->id)
                ->lockForUpdate()
                ->firstOrFail();

            $fulfillment = Fulfillment::query()
                ->where('sales_order_id', $order->id)
                ->lockForUpdate()
                ->first();

            if (! $fulfillment) {
                throw new RuntimeException(
                    'Fulfillment has not been started.'
                );
            }

            if ($order->status !== OrderStatus::PACKING) {
                throw new RuntimeException(
                    'Only orders currently being packed can complete fulfillment.'
                );
            }

            if ($fulfillment->status !== FulfillmentStatus::IN_PROGRESS) {
                throw new RuntimeException(
                    'Only in-progress fulfillment can be completed.'
                );
            }

            $fulfillment->update([
                'status' => FulfillmentStatus::COMPLETED,
                'completed_at' => now(),
                'notes' => $notes,
            ]);

            $order->update([
                'status' => OrderStatus::READY_FOR_DELIVERY,
            ]);

            return $fulfillment->refresh();
        });
    }
}
