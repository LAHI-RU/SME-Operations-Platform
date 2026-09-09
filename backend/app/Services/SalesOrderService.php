<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OrderStatus;
use App\Exceptions\BusinessConflictException;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\SalesOrder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SalesOrderService
{
    public function __construct(
        private readonly InventoryService $inventoryService,
        private readonly SalesOrderNumberService $numberService,
    ) {}

    public function createDraft(
        int $customerId,
        int $createdBy,
        array $items,
        ?string $notes = null,
    ): SalesOrder {
        return DB::transaction(function () use (
            $customerId,
            $createdBy,
            $items,
            $notes,
        ): SalesOrder {
            $salesOrder = SalesOrder::query()->create([
                'order_number' => $this->numberService->generate(),
                'customer_id' => $customerId,
                'created_by' => $createdBy,
                'status' => OrderStatus::DRAFT,
                'order_date' => now(),
                'total_amount' => 0,
                'notes' => $notes,
            ]);

            $total = 0;

            foreach ($items as $item) {
                $product = Product::query()
                    ->findOrFail($item['product_id']);

                $unitPrice = (float) $product->selling_price;
                $quantity = (int) $item['quantity'];
                $subtotal = $unitPrice * $quantity;

                $salesOrder->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                ]);

                $total += $subtotal;
            }

            $salesOrder->update([
                'total_amount' => $total,
            ]);

            return $salesOrder
                ->refresh()
                ->load('customer', 'items.product');
        });
    }

    public function submit(SalesOrder $salesOrder): SalesOrder
    {
        if ($salesOrder->status !== OrderStatus::DRAFT) {
            throw new BusinessConflictException(
                'Only draft orders can be submitted.'
            );
        }

        $salesOrder->update([
            'status' => OrderStatus::SUBMITTED,
        ]);

        return $salesOrder->refresh();
    }

    public function confirm(
        SalesOrder $salesOrder,
        ?int $createdBy = null,
    ): SalesOrder {
        return DB::transaction(function () use (
            $salesOrder,
            $createdBy,
        ): SalesOrder {
            $order = SalesOrder::query()
                ->whereKey($salesOrder->id)
                ->with('items.product')
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->status !== OrderStatus::SUBMITTED) {
                throw new BusinessConflictException(
                    'Only submitted orders can be confirmed.'
                );
            }

            $items = $order->items
                ->sortBy('product_id')
                ->values();

            /*
                   * Lock and check every inventory row before changing anything.
                   */
            foreach ($items as $item) {
                $inventory = Inventory::query()
                    ->where('product_id', $item->product_id)
                    ->lockForUpdate()
                    ->first();

                if (! $inventory) {
                    throw new RuntimeException(
                        "No inventory record exists for product {$item->product_id}."
                    );
                }

                if ($inventory->quantity < $item->quantity) {
                    $order->update([
                        'status' => OrderStatus::PENDING_STOCK,
                    ]);

                    return $order
                        ->refresh()
                        ->load('customer', 'items.product');
                }
            }

            /*
                   * All stock checks passed.
                   * Now deduct stock and create inventory transactions.
                   */
            foreach ($items as $item) {
                $this->inventoryService->removeStockWithinTransaction(
                    product: $item->product,
                    quantity: $item->quantity,
                    type: 'SALE',
                    referenceType: 'SalesOrder',
                    referenceId: $order->id,
                    notes: "Stock issued for {$order->order_number}.",
                    createdBy: $createdBy,
                );
            }

            $order->update([
                'status' => OrderStatus::CONFIRMED,
            ]);

            return $order
                ->refresh()
                ->load('customer', 'items.product');
        });
    }
}
