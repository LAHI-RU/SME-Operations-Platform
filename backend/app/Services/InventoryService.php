<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Product;
use Illuminate\Database\ConnectionInterface;
use InvalidArgumentException;
use RuntimeException;

class InventoryService
{
    public function __construct(
        private readonly ConnectionInterface $connection,
    ) {}

    public function addStock(
        Product $product,
        int $quantity,
        string $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $notes = null,
        ?int $createdBy = null,
    ): Inventory {
        $this->validateQuantity($quantity);

        if (! in_array($type, ['PURCHASE', 'RETURN', 'ADJUSTMENT_IN'], true)) {
            throw new InvalidArgumentException(
                "Invalid stock-in transaction type: {$type}"
            );
        }

        return $this->connection->transaction(function () use (
            $product,
            $quantity,
            $type,
            $referenceType,
            $referenceId,
            $notes,
            $createdBy,
        ): Inventory {
            $inventory = Inventory::query()
                ->where('product_id', $product->id)
                ->lockForUpdate()
                ->first();

            if (! $inventory) {
                $inventory = Inventory::query()->create([
                    'product_id' => $product->id,
                    'quantity' => 0,
                ]);

                $inventory = Inventory::query()
                    ->whereKey($inventory->id)
                    ->lockForUpdate()
                    ->firstOrFail();
            }

            $inventory->increment('quantity', $quantity);

            InventoryTransaction::query()->create([
                'product_id' => $product->id,
                'type' => $type,
                'quantity' => $quantity,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'notes' => $notes,
                'created_by' => $createdBy,
            ]);

            return $inventory->refresh();
        });
    }

    public function removeStockWithinTransaction(
        Product $product,
        int $quantity,
        string $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $notes = null,
        ?int $createdBy = null,
    ): Inventory {
        $this->validateQuantity($quantity);

        if (! in_array($type, ['SALE', 'ADJUSTMENT_OUT'], true)) {
            throw new InvalidArgumentException(
                "Invalid stock-out transaction type: {$type}"
            );
        }

        $inventory = Inventory::query()
            ->where('product_id', $product->id)
            ->lockForUpdate()
            ->first();

        if (! $inventory) {
            throw new RuntimeException('Inventory record does not exist.');
        }

        if ($inventory->quantity < $quantity) {
            throw new InsufficientStockException(
                available: $inventory->quantity,
                requested: $quantity,
            );
        }

        $inventory->decrement('quantity', $quantity);

        InventoryTransaction::query()->create([
            'product_id' => $product->id,
            'type' => $type,
            'quantity' => -$quantity,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'notes' => $notes,
            'created_by' => $createdBy,
        ]);

        return $inventory->refresh();
    }

    public function removeStock(
        Product $product,
        int $quantity,
        string $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $notes = null,
        ?int $createdBy = null,
    ): Inventory {
        $this->validateQuantity($quantity);

        if (! in_array($type, ['SALE', 'ADJUSTMENT_OUT'], true)) {
            throw new InvalidArgumentException(
                "Invalid stock-out transaction type: {$type}"
            );
        }

        return $this->connection->transaction(function () use (
            $product,
            $quantity,
            $type,
            $referenceType,
            $referenceId,
            $notes,
            $createdBy,
        ): Inventory {
            $inventory = Inventory::query()
                ->where('product_id', $product->id)
                ->lockForUpdate()
                ->first();

            if (! $inventory) {
                throw new RuntimeException('Inventory record does not exist.');
            }

            if ($inventory->quantity < $quantity) {
                throw new InsufficientStockException(
                    available: $inventory->quantity,
                    requested: $quantity,
                );
            }

            $inventory->decrement('quantity', $quantity);

            InventoryTransaction::query()->create([
                'product_id' => $product->id,
                'type' => $type,
                'quantity' => -$quantity,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'notes' => $notes,
                'created_by' => $createdBy,
            ]);

            return $inventory->refresh();
        });
    }

    private function validateQuantity(int $quantity): void
    {
        if ($quantity <= 0) {
            throw new InvalidArgumentException(
                'Quantity must be greater than zero.'
            );
        }
    }
}
