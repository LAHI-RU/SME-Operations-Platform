<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StockInRequest;
use App\Http\Requests\Api\V1\StockOutRequest;
use App\Http\Resources\Api\V1\InventoryResource;
use App\Http\Resources\Api\V1\InventoryTransactionResource;
use App\Models\Inventory;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InventoryController extends Controller
{
    public function show(Product $product): InventoryResource
    {
        $inventory = Inventory::query()
            ->where('product_id', $product->id)
            ->with('product')
            ->firstOrCreate([
                'product_id' => $product->id,
            ], [
                'quantity' => 0,
            ]);

        return new InventoryResource($inventory);
    }

    public function stockIn(
        StockInRequest $request,
        Product $product,
        InventoryService $inventoryService,
    ): InventoryResource {
        $data = $request->validated();

        $inventory = $inventoryService->addStock(
            product: $product,
            quantity: (int) $data['quantity'],
            type: $data['type'],
            referenceType: $data['reference_type'] ?? null,
            referenceId: isset($data['reference_id'])
                ? (int) $data['reference_id']
                : null,
            notes: $data['notes'] ?? null,
        );

        return new InventoryResource(
            $inventory->load('product')
        );
    }

    public function stockOut(
        StockOutRequest $request,
        Product $product,
        InventoryService $inventoryService,
    ): InventoryResource {
        $data = $request->validated();

        $inventory = $inventoryService->removeStock(
            product: $product,
            quantity: (int) $data['quantity'],
            type: $data['type'],
            referenceType: $data['reference_type'] ?? null,
            referenceId: isset($data['reference_id'])
                ? (int) $data['reference_id']
                : null,
            notes: $data['notes'] ?? null,
        );

        return new InventoryResource(
            $inventory->load('product')
        );
    }

    public function transactions(
        Product $product,
    ): AnonymousResourceCollection {
        $transactions = $product->inventoryTransactions()
            ->latest('id')
            ->paginate(15);

        return InventoryTransactionResource::collection($transactions);
    }
}
