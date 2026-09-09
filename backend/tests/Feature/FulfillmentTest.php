<?php

declare(strict_types=1);

use App\Enums\FulfillmentStatus;
use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\User;
use App\Services\FulfillmentService;
use App\Services\SalesOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createConfirmedOrderForFulfillmentTest(): array
{
    $user = User::factory()->create();
    $customer = Customer::factory()->create();

    $category = Category::factory()->create();

    $product = Product::factory()->create([
        'category_id' => $category->id,
    ]);

    Inventory::query()->create([
        'product_id' => $product->id,
        'quantity' => 20,
    ]);

    $salesOrderService = app(SalesOrderService::class);

    $order = $salesOrderService->createDraft(
        customerId: $customer->id,
        createdBy: $user->id,
        items: [
            [
                'product_id' => $product->id,
                'quantity' => 5,
            ],
        ],
    );

    $salesOrderService->submit($order);

    $order = $salesOrderService->confirm(
        salesOrder: $order->refresh(),
        createdBy: $user->id,
    );

    return [
        'user' => $user,
        'order' => $order,
    ];
}

test('confirmed order can start fulfillment', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    $fulfillment = app(FulfillmentService::class)->start(
        salesOrder: $data['order'],
        packedBy: $data['user']->id,
    );

    expect($fulfillment->status)->toBe(
        FulfillmentStatus::IN_PROGRESS
    );

    expect($data['order']->refresh()->status)->toBe(
        OrderStatus::PACKING
    );

    $this->assertDatabaseHas('fulfillments', [
        'sales_order_id' => $data['order']->id,
        'status' => 'IN_PROGRESS',
        'packed_by' => $data['user']->id,
    ]);
});

test('fulfillment cannot start twice', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    $service = app(FulfillmentService::class);

    $service->start(
        salesOrder: $data['order'],
        packedBy: $data['user']->id,
    );

    expect(fn () => $service->start(
        salesOrder: $data['order']->refresh(),
        packedBy: $data['user']->id,
    ))->toThrow(
        RuntimeException::class,
        'Fulfillment has already been started'
    );
});

test('only confirmed orders can start fulfillment', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::SUBMITTED,
    ]);

    expect(fn () => app(FulfillmentService::class)->start(
        salesOrder: $order,
        packedBy: $user->id,
    ))->toThrow(
        RuntimeException::class,
        'Only confirmed orders can start fulfillment.'
    );
});

test('in-progress fulfillment can be completed', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    $service = app(FulfillmentService::class);

    $fulfillment = $service->start(
        salesOrder: $data['order'],
        packedBy: $data['user']->id,
    );

    $completed = $service->complete(
        salesOrder: $data['order']->refresh(),
        notes: 'All items packed successfully.',
    );

    expect($completed->status)->toBe(
        FulfillmentStatus::COMPLETED
    );

    expect($data['order']->refresh()->status)->toBe(
        OrderStatus::READY_FOR_DELIVERY
    );

    expect($completed->completed_at)->not->toBeNull();

    expect($completed->notes)->toBe(
        'All items packed successfully.'
    );
});

test('fulfillment cannot be completed before it starts', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    expect(fn () => app(FulfillmentService::class)->complete(
        salesOrder: $data['order'],
    ))->toThrow(
        RuntimeException::class,
        'Fulfillment has not been started.'
    );
});

test('completed fulfillment cannot be completed again', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    $service = app(FulfillmentService::class);

    $service->start(
        salesOrder: $data['order'],
        packedBy: $data['user']->id,
    );

    $service->complete(
        salesOrder: $data['order']->refresh(),
    );

    expect(fn () => $service->complete(
        salesOrder: $data['order']->refresh(),
    ))->toThrow(
        RuntimeException::class,
        'Only orders currently being packed can complete fulfillment.'
    );
});

test('a warehouse user can start fulfillment through the API', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    $data['user']->update([
        'role' => UserRole::WAREHOUSE,
    ]);

    $this->actingAs($data['user'], 'sanctum');

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/fulfillment/start",
    );

    $response->assertSuccessful();
});

test('a sales user cannot start fulfillment through the API', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    $data['user']->update([
        'role' => UserRole::SALES,
    ]);

    $this->actingAs($data['user'], 'sanctum');

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/fulfillment/start",
    );

    $response->assertForbidden();
});

test('a warehouse user can complete fulfillment through the API', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    $data['user']->update([
        'role' => UserRole::WAREHOUSE,
    ]);

    $this->actingAs($data['user'], 'sanctum');

    app(FulfillmentService::class)->start(
        salesOrder: $data['order'],
        packedBy: $data['user']->id,
    );

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/fulfillment/complete",
    );

    $response->assertSuccessful();
});

test('a sales user cannot complete fulfillment through the API', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    $data['user']->update([
        'role' => UserRole::SALES,
    ]);

    $this->actingAs($data['user'], 'sanctum');

    app(FulfillmentService::class)->start(
        salesOrder: $data['order'],
        packedBy: $data['user']->id,
    );

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/fulfillment/complete",
    );

    $response->assertForbidden();
});

test('an authenticated user can start fulfillment through the API', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    $this->actingAs($data['user'], 'sanctum');

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/fulfillment/start",
    );

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.status', 'IN_PROGRESS');

    expect($data['order']->refresh()->status)->toBe(
        OrderStatus::PACKING
    );
});

test('an unauthenticated user cannot start fulfillment through the API', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/fulfillment/start",
    );

    $response->assertUnauthorized();
});

test('an authenticated user can complete fulfillment through the API', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    $this->actingAs($data['user'], 'sanctum');

    app(FulfillmentService::class)->start(
        salesOrder: $data['order'],
        packedBy: $data['user']->id,
    );

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/fulfillment/complete",
        [
            'notes' => 'All items packed successfully.',
        ],
    );

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.status', 'COMPLETED')
        ->assertJsonPath(
            'data.notes',
            'All items packed successfully.'
        );

    expect($data['order']->refresh()->status)->toBe(
        OrderStatus::READY_FOR_DELIVERY
    );
});

test('an unauthenticated user cannot complete fulfillment through the API', function () {
    $data = createConfirmedOrderForFulfillmentTest();

    app(FulfillmentService::class)->start(
        salesOrder: $data['order'],
        packedBy: $data['user']->id,
    );

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/fulfillment/complete",
        [
            'notes' => 'All items packed successfully.',
        ],
    );

    $response->assertUnauthorized();
});
