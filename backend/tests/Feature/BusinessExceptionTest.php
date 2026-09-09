<?php

declare(strict_types=1);

use App\Enums\DeliveryStatus;
use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Models\Delivery;
use App\Models\Fulfillment;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\User;
use App\Services\SalesOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;

uses(RefreshDatabase::class);

test('invalid workflow actions return a safe conflict response', function (
    OrderStatus $status,
    string $action,
    string $message,
): void {
    config(['app.debug' => true]);

    $user = User::factory()->create(['role' => UserRole::ADMIN]);
    $order = SalesOrder::factory()->create(['status' => $status]);
    $payload = $action === 'delivery/assign'
        ? ['assigned_to' => User::factory()->create(['role' => UserRole::DELIVERY])->id]
        : [];

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/{$action}", $payload)
        ->assertConflict()
        ->assertExactJson(['success' => false, 'message' => $message]);

    expect($order->refresh()->status)->toBe($status);
    $this->assertDatabaseCount('fulfillments', 0);
    $this->assertDatabaseCount('deliveries', 0);
    $this->assertDatabaseCount('sales_order_status_histories', 0);
})->with([
    'submit non-draft' => [OrderStatus::SUBMITTED, 'submit', 'Only draft orders can be submitted.'],
    'confirm draft' => [OrderStatus::DRAFT, 'confirm', 'Only submitted orders can be confirmed.'],
    'start fulfillment before confirmation' => [OrderStatus::DRAFT, 'fulfillment/start', 'Only confirmed orders can start fulfillment.'],
    'complete missing fulfillment' => [OrderStatus::CONFIRMED, 'fulfillment/complete', 'Fulfillment has not been started.'],
    'assign before ready' => [OrderStatus::PACKING, 'delivery/assign', 'Only orders ready for delivery can be assigned.'],
    'start missing delivery' => [OrderStatus::READY_FOR_DELIVERY, 'delivery/start', 'Delivery has not been assigned.'],
    'complete missing delivery' => [OrderStatus::READY_FOR_DELIVERY, 'delivery/complete', 'Delivery has not been assigned.'],
]);

test('starting fulfillment twice returns conflict without duplicating records', function (): void {
    config(['app.debug' => true]);
    $order = SalesOrder::factory()->create(['status' => OrderStatus::PACKING]);
    $fulfillment = Fulfillment::factory()->create(['sales_order_id' => $order->id]);
    $original = $fulfillment->refresh()->getAttributes();

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/fulfillment/start")
        ->assertConflict()
        ->assertExactJson([
            'success' => false,
            'message' => 'Fulfillment has already been started for this order.',
        ]);

    expect($fulfillment->refresh()->getAttributes())->toBe($original);
    expect($order->refresh()->status)->toBe(OrderStatus::PACKING);
    $this->assertDatabaseCount('fulfillments', 1);
});

test('delivery cannot complete before it is out for delivery', function (): void {
    config(['app.debug' => true]);
    $order = SalesOrder::factory()->create(['status' => OrderStatus::ASSIGNED]);
    $delivery = Delivery::factory()->assigned()->create(['sales_order_id' => $order->id]);

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/delivery/complete")
        ->assertConflict()
        ->assertExactJson([
            'success' => false,
            'message' => 'Only deliveries currently out for delivery can be completed.',
        ]);

    expect($delivery->refresh()->status)->toBe(DeliveryStatus::ASSIGNED);
    expect($delivery->delivered_at)->toBeNull();
    expect($order->refresh()->status)->toBe(OrderStatus::ASSIGNED);
    $this->assertDatabaseCount('sales_order_status_histories', 0);
});

test('insufficient stock returns conflict without changing inventory', function (): void {
    config(['app.debug' => true]);
    $product = Product::factory()->create();
    $inventory = Inventory::query()->create(['product_id' => $product->id, 'quantity' => 5]);

    $this->actingAs(User::factory()->create(['role' => UserRole::WAREHOUSE]), 'sanctum')
        ->postJson("/api/v1/inventory/{$product->id}/stock-out", [
            'quantity' => 6,
            'type' => 'ADJUSTMENT_OUT',
        ])
        ->assertConflict()
        ->assertExactJson([
            'success' => false,
            'message' => 'Insufficient stock. Available: 5, requested: 6.',
        ]);

    expect($inventory->refresh()->quantity)->toBe(5);
    $this->assertDatabaseCount('inventory_transactions', 0);
});

test('invalid stock input remains a validation error', function (): void {
    $product = Product::factory()->create();

    $this->actingAs(User::factory()->create(['role' => UserRole::WAREHOUSE]), 'sanctum')
        ->postJson("/api/v1/inventory/{$product->id}/stock-out", [
            'quantity' => 0,
            'type' => 'UNKNOWN',
        ])
        ->assertUnprocessable()
        ->assertJsonStructure(['message', 'errors' => ['quantity', 'type']])
        ->assertJsonValidationErrors(['quantity', 'type']);
});

test('missing inventory during confirmation remains an internal failure', function (): void {
    config(['app.debug' => false]);
    $order = SalesOrder::factory()->create(['status' => OrderStatus::SUBMITTED]);
    SalesOrderItem::factory()->create(['sales_order_id' => $order->id]);

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/confirm")
        ->assertInternalServerError()
        ->assertExactJson(['message' => 'Server Error']);

    expect($order->refresh()->status)->toBe(OrderStatus::SUBMITTED);
    $this->assertDatabaseCount('inventory_transactions', 0);
});

test('a missing order remains not found', function (): void {
    $order = SalesOrder::factory()->create();

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->postJson('/api/v1/orders/'.($order->id + 1).'/confirm')
        ->assertNotFound()
        ->assertJsonStructure(['message']);
});

test('unexpected confirmation exceptions are not exposed as business conflicts', function (string $exceptionClass): void {
    config(['app.debug' => false]);
    $order = SalesOrder::factory()->create(['status' => OrderStatus::SUBMITTED]);

    $this->mock(SalesOrderService::class, function (MockInterface $mock) use ($exceptionClass): void {
        $mock->shouldReceive('confirm')->once()->andThrow(new $exceptionClass('Internal diagnostic detail.'));
    });

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->postJson("/api/v1/orders/{$order->id}/confirm")
        ->assertInternalServerError()
        ->assertExactJson(['message' => 'Server Error']);
})->with([
    'runtime failure' => [RuntimeException::class],
    'programming failure' => [InvalidArgumentException::class],
]);
