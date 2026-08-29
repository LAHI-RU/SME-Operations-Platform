<?php

declare(strict_types=1);

use App\Models\Category;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\User;
use App\Services\SalesOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createProductWithStockForOrderTest(
    int $stock,
    array $attributes = [],
): Product {
    $category = Category::factory()->create();

    $product = Product::factory()->create(
        array_merge([
            'category_id' => $category->id,
        ], $attributes)
    );

    Inventory::query()->create([
        'product_id' => $product->id,
        'quantity' => $stock,
    ]);

    return $product;
}

function createDraftOrderForTest(
    Customer $customer,
    User $user,
    Product $product,
    int $quantity,
): SalesOrder {
    $service = app(SalesOrderService::class);

    return $service->createDraft(
        customerId: $customer->id,
        createdBy: $user->id,
        items: [
            [
                'product_id' => $product->id,
                'quantity' => $quantity,
            ],
        ],
    );
}

test('a draft order can be created', function () {
    $customer = Customer::factory()->create();
    $user = User::factory()->create();

    $product = createProductWithStockForOrderTest(20);

    $order = createDraftOrderForTest(
        customer: $customer,
        user: $user,
        product: $product,
        quantity: 5,
    );

    expect($order->status)->toBe('DRAFT');
    expect((float) $order->total_amount)
        ->toEqualWithDelta(
            (float) $product->selling_price * 5,
            0.000001
        );

    expect($order->items)->toHaveCount(1);

    $this->assertDatabaseHas('sales_orders', [
        'id' => $order->id,
        'status' => 'DRAFT',
    ]);

    $this->assertDatabaseHas('sales_order_items', [
        'sales_order_id' => $order->id,
        'product_id' => $product->id,
        'quantity' => 5,
    ]);
});

test('a draft order can be submitted', function () {
    $customer = Customer::factory()->create();
    $user = User::factory()->create();
    $product = createProductWithStockForOrderTest(20);

    $order = createDraftOrderForTest(
        customer: $customer,
        user: $user,
        product: $product,
        quantity: 5,
    );

    $order = app(SalesOrderService::class)->submit($order);

    expect($order->status)->toBe('SUBMITTED');
});

test('a submitted order is confirmed when enough stock exists', function () {
    $customer = Customer::factory()->create();
    $user = User::factory()->create();
    $product = createProductWithStockForOrderTest(20);

    $order = createDraftOrderForTest(
        customer: $customer,
        user: $user,
        product: $product,
        quantity: 5,
    );

    $service = app(SalesOrderService::class);

    $service->submit($order);

    $confirmedOrder = $service->confirm(
        salesOrder: $order->refresh(),
        createdBy: $user->id,
    );

    expect($confirmedOrder->status)->toBe('CONFIRMED');

    $this->assertDatabaseHas('inventories', [
        'product_id' => $product->id,
        'quantity' => 15,
    ]);

    $this->assertDatabaseHas('inventory_transactions', [
        'product_id' => $product->id,
        'type' => 'SALE',
        'quantity' => -5,
        'reference_type' => 'SalesOrder',
        'reference_id' => $order->id,
    ]);
});

test('an order becomes pending stock when inventory is insufficient', function () {
    $customer = Customer::factory()->create();
    $user = User::factory()->create();
    $product = createProductWithStockForOrderTest(3);

    $order = createDraftOrderForTest(
        customer: $customer,
        user: $user,
        product: $product,
        quantity: 5,
    );

    $service = app(SalesOrderService::class);

    $service->submit($order);

    $result = $service->confirm(
        salesOrder: $order->refresh(),
        createdBy: $user->id,
    );

    expect($result->status)->toBe('PENDING_STOCK');

    $this->assertDatabaseHas('inventories', [
        'product_id' => $product->id,
        'quantity' => 3,
    ]);

    $this->assertDatabaseMissing('inventory_transactions', [
        'product_id' => $product->id,
        'type' => 'SALE',
        'reference_id' => $order->id,
    ]);
});

test('an order with multiple items confirms only when all stock is available', function () {
    $customer = Customer::factory()->create();
    $user = User::factory()->create();

    $productA = createProductWithStockForOrderTest(20);
    $productB = createProductWithStockForOrderTest(10);

    $service = app(SalesOrderService::class);

    $order = $service->createDraft(
        customerId: $customer->id,
        createdBy: $user->id,
        items: [
            [
                'product_id' => $productA->id,
                'quantity' => 5,
            ],
            [
                'product_id' => $productB->id,
                'quantity' => 3,
            ],
        ],
    );

    $service->submit($order);

    $result = $service->confirm(
        salesOrder: $order->refresh(),
        createdBy: $user->id,
    );

    expect($result->status)->toBe('CONFIRMED');

    $this->assertDatabaseHas('inventories', [
        'product_id' => $productA->id,
        'quantity' => 15,
    ]);

    $this->assertDatabaseHas('inventories', [
        'product_id' => $productB->id,
        'quantity' => 7,
    ]);
});

test('a draft order cannot be confirmed directly', function () {
    $customer = Customer::factory()->create();
    $user = User::factory()->create();
    $product = createProductWithStockForOrderTest(20);

    $order = createDraftOrderForTest(
        customer: $customer,
        user: $user,
        product: $product,
        quantity: 5,
    );

    expect(fn() => app(SalesOrderService::class)->confirm($order))
        ->toThrow(
            RuntimeException::class,
            'Only submitted orders can be confirmed.'
        );
});

test('a confirmed order cannot be confirmed again', function () {
    $customer = Customer::factory()->create();
    $user = User::factory()->create();
    $product = createProductWithStockForOrderTest(20);

    $service = app(SalesOrderService::class);

    $order = createDraftOrderForTest(
        customer: $customer,
        user: $user,
        product: $product,
        quantity: 5,
    );

    $service->submit($order);

    $confirmed = $service->confirm(
        salesOrder: $order->refresh(),
        createdBy: $user->id,
    );

    expect($confirmed->status)->toBe('CONFIRMED');

    expect(fn() => $service->confirm($confirmed))
        ->toThrow(
            RuntimeException::class,
            'Only submitted orders can be confirmed.'
        );
});

test('an authenticated user can create a sales order through the API', function () {
    $user = User::factory()->create();
    $customer = Customer::factory()->create();
    $product = createProductWithStockForOrderTest(20);

    $response = $this
        ->actingAs($user, 'sanctum')
        ->postJson('/api/v1/orders', [
            'customer_id' => $customer->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 5,
                ],
            ],
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.customer.id', $customer->id)
        ->assertJsonPath('data.status', 'DRAFT')
        ->assertJsonPath('data.items.0.product_id', $product->id)
        ->assertJsonPath('data.items.0.quantity', 5);
});

test('an unauthenticated user cannot create a sales order', function () {
    $customer = Customer::factory()->create();
    $product = createProductWithStockForOrderTest(20);

    $response = $this->postJson('/api/v1/orders', [
        'customer_id' => $customer->id,
        'items' => [
            [
                'product_id' => $product->id,
                'quantity' => 5,
            ],
        ],
    ]);

    $response->assertUnauthorized();
});

test('an authenticated user can submit an order', function () {
    $user = User::factory()->create();
    $customer = Customer::factory()->create();
    $product = createProductWithStockForOrderTest(20);

    $order = createDraftOrderForTest(
        customer: $customer,
        user: $user,
        product: $product,
        quantity: 5,
    );

    $response = $this
        ->actingAs($user, 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/submit");

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.status', 'SUBMITTED');
});

test('an authenticated user can confirm an order through the API', function () {
    $user = User::factory()->create();
    $customer = Customer::factory()->create();
    $product = createProductWithStockForOrderTest(20);

    $order = createDraftOrderForTest(
        customer: $customer,
        user: $user,
        product: $product,
        quantity: 5,
    );

    $service = app(SalesOrderService::class);

    $service->submit($order);

    $response = $this
        ->actingAs($user, 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/confirm");

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.status', 'CONFIRMED');

    $this->assertDatabaseHas('inventories', [
        'product_id' => $product->id,
        'quantity' => 15,
    ]);
});
