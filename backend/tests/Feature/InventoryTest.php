<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Exceptions\InsufficientStockException;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Product;
use App\Models\User;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createProductForInventoryTest(array $attributes = []): Product
{
    $category = Category::factory()->create();

    $product = Product::factory()->create(
        array_merge([
            'category_id' => $category->id,
        ], $attributes)
    );

    Inventory::query()->create([
        'product_id' => $product->id,
        'quantity' => 0,
    ]);

    return $product->refresh();
}

test('a product can have an inventory record', function () {
    $product = createProductForInventoryTest();

    $inventory = Inventory::query()
        ->where('product_id', $product->id)
        ->first();

    expect($inventory)->not->toBeNull();
    expect($inventory->quantity)->toBe(0);
});

test('stock can be added', function () {
    $product = createProductForInventoryTest();

    $inventory = app(InventoryService::class)->addStock(
        product: $product,
        quantity: 100,
        type: 'PURCHASE',
        referenceType: 'PurchaseOrder',
        referenceId: 1,
    );

    expect($inventory->quantity)->toBe(100);

    $this->assertDatabaseHas('inventories', [
        'product_id' => $product->id,
        'quantity' => 100,
    ]);

    $this->assertDatabaseHas('inventory_transactions', [
        'product_id' => $product->id,
        'type' => 'PURCHASE',
        'quantity' => 100,
        'reference_type' => 'PurchaseOrder',
        'reference_id' => 1,
    ]);
});

test('stock can be removed when sufficient stock exists', function () {
    $product = createProductForInventoryTest();

    $service = app(InventoryService::class);

    $service->addStock(
        product: $product,
        quantity: 100,
        type: 'PURCHASE',
    );

    $inventory = $service->removeStock(
        product: $product,
        quantity: 30,
        type: 'SALE',
        referenceType: 'SalesOrder',
        referenceId: 10,
    );

    expect($inventory->quantity)->toBe(70);

    $this->assertDatabaseHas('inventory_transactions', [
        'product_id' => $product->id,
        'type' => 'SALE',
        'quantity' => -30,
        'reference_type' => 'SalesOrder',
        'reference_id' => 10,
    ]);
});

test('stock cannot be removed when insufficient stock exists', function () {
    $product = createProductForInventoryTest();

    $service = app(InventoryService::class);

    $service->addStock(
        product: $product,
        quantity: 10,
        type: 'PURCHASE',
    );

    expect(fn () => $service->removeStock(
        product: $product,
        quantity: 11,
        type: 'SALE',
    ))->toThrow(
        InsufficientStockException::class
    );

    $this->assertDatabaseHas('inventories', [
        'product_id' => $product->id,
        'quantity' => 10,
    ]);
});

test('failed stock removal does not change the inventory', function () {
    $product = createProductForInventoryTest();

    $service = app(InventoryService::class);

    $service->addStock(
        product: $product,
        quantity: 5,
        type: 'PURCHASE',
    );

    expect(fn () => $service->removeStock(
        product: $product,
        quantity: 10,
        type: 'SALE',
    ))->toThrow(
        InsufficientStockException::class
    );

    $inventory = Inventory::query()
        ->where('product_id', $product->id)
        ->firstOrFail();

    expect($inventory->quantity)->toBe(5);
});

test('failed stock removal does not create a sale transaction', function () {
    $product = createProductForInventoryTest();

    $service = app(InventoryService::class);

    $service->addStock(
        product: $product,
        quantity: 5,
        type: 'PURCHASE',
    );

    expect(fn () => $service->removeStock(
        product: $product,
        quantity: 10,
        type: 'SALE',
    ))->toThrow(
        InsufficientStockException::class
    );

    $saleTransactions = InventoryTransaction::query()
        ->where('product_id', $product->id)
        ->where('type', 'SALE')
        ->count();

    expect($saleTransactions)->toBe(0);
});

test('a warehouse user can add stock through the API', function () {
    $user = User::factory()->create([
        'role' => UserRole::WAREHOUSE,
    ]);

    $product = Product::factory()->create();

    $this->actingAs($user, 'sanctum');

    $response = $this->postJson(
        "/api/v1/inventory/{$product->id}/stock-in",
        [
            'quantity' => 10,
            'type' => 'PURCHASE',
        ],
    );

    $response->assertSuccessful();
});

test('a sales user cannot add stock through the API', function () {
    $user = User::factory()->create([
        'role' => UserRole::SALES,
    ]);

    $product = Product::factory()->create();

    $this->actingAs($user, 'sanctum');

    $response = $this->postJson(
        "/api/v1/inventory/{$product->id}/stock-in",
        [
            'quantity' => 10,
            'type' => 'PURCHASE',
        ],
    );

    $response->assertForbidden();
});

test('a warehouse user can remove stock through the API', function () {
    $user = User::factory()->create([
        'role' => UserRole::WAREHOUSE,
    ]);

    $product = Product::factory()->create();

    Inventory::query()->create([
        'product_id' => $product->id,
        'quantity' => 20,
    ]);

    $this->actingAs($user, 'sanctum');

    $response = $this->postJson(
        "/api/v1/inventory/{$product->id}/stock-out",
        [
            'quantity' => 5,
            'type' => 'ADJUSTMENT_OUT',
        ],
    );

    $response->assertSuccessful();
});

test('a sales user cannot remove stock through the API', function () {
    $user = User::factory()->create([
        'role' => UserRole::SALES,
    ]);

    $product = Product::factory()->create();

    Inventory::query()->create([
        'product_id' => $product->id,
        'quantity' => 20,
    ]);

    $this->actingAs($user, 'sanctum');

    $response = $this->postJson(
        "/api/v1/inventory/{$product->id}/stock-out",
        [
            'quantity' => 5,
            'type' => 'ADJUSTMENT_OUT',
        ],
    );

    $response->assertForbidden();
});
