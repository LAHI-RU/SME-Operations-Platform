<?php

declare(strict_types=1);

use App\Enums\OrderStatus;
use App\Models\SalesOrder;
use App\Models\SalesOrderStatusHistory;
use App\Models\User;
use App\Services\SalesOrderStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a draft order can transition to submitted', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::DRAFT,
    ]);

    $result = app(SalesOrderStatusService::class)->transition(
        salesOrder: $order,
        toStatus: OrderStatus::SUBMITTED,
        changedBy: $user->id,
        reason: 'Order submitted for processing.',
    );

    expect($result->status)->toBe(OrderStatus::SUBMITTED);

    $this->assertDatabaseHas('sales_order_status_histories', [
        'sales_order_id' => $order->id,
        'from_status' => 'DRAFT',
        'to_status' => 'SUBMITTED',
        'changed_by' => $user->id,
    ]);
});

test('an invalid status transition is rejected', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::DRAFT,
    ]);

    expect(fn () => app(SalesOrderStatusService::class)->transition(
        salesOrder: $order,
        toStatus: OrderStatus::DELIVERED,
        changedBy: $user->id,
    ))->toThrow(
        InvalidArgumentException::class,
        'Invalid order status transition'
    );

    $this->assertDatabaseHas('sales_orders', [
        'id' => $order->id,
        'status' => 'DRAFT',
    ]);
});

test('an order cannot transition to the same status', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::DRAFT,
    ]);

    expect(fn () => app(SalesOrderStatusService::class)->transition(
        salesOrder: $order,
        toStatus: OrderStatus::DRAFT,
        changedBy: $user->id,
    ))->toThrow(
        InvalidArgumentException::class,
        'already in this status'
    );
});

test('a submitted order can transition to pending stock', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::SUBMITTED,
    ]);

    $result = app(SalesOrderStatusService::class)->transition(
        salesOrder: $order,
        toStatus: OrderStatus::PENDING_STOCK,
        changedBy: $user->id,
        reason: 'Stock is currently insufficient.',
    );

    expect($result->status)->toBe(OrderStatus::PENDING_STOCK);
});

test('a confirmed order can transition to packing', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::CONFIRMED,
    ]);

    $result = app(SalesOrderStatusService::class)->transition(
        salesOrder: $order,
        toStatus: OrderStatus::PACKING,
        changedBy: $user->id,
    );

    expect($result->status)->toBe(OrderStatus::PACKING);
});

test('packing can transition to ready for delivery', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::PACKING,
    ]);

    $result = app(SalesOrderStatusService::class)->transition(
        salesOrder: $order,
        toStatus: OrderStatus::READY_FOR_DELIVERY,
        changedBy: $user->id,
    );

    expect($result->status)->toBe(OrderStatus::READY_FOR_DELIVERY);
});

test('ready for delivery can transition to assigned', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::READY_FOR_DELIVERY,
    ]);

    $result = app(SalesOrderStatusService::class)->transition(
        salesOrder: $order,
        toStatus: OrderStatus::ASSIGNED,
        changedBy: $user->id,
    );

    expect($result->status)->toBe(OrderStatus::ASSIGNED);
});

test('assigned can transition to out for delivery', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::ASSIGNED,
    ]);

    $result = app(SalesOrderStatusService::class)->transition(
        salesOrder: $order,
        toStatus: OrderStatus::OUT_FOR_DELIVERY,
        changedBy: $user->id,
    );

    expect($result->status)->toBe(OrderStatus::OUT_FOR_DELIVERY);
});

test('out for delivery can transition to delivered', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::OUT_FOR_DELIVERY,
    ]);

    $result = app(SalesOrderStatusService::class)->transition(
        salesOrder: $order,
        toStatus: OrderStatus::DELIVERED,
        changedBy: $user->id,
    );

    expect($result->status)->toBe(OrderStatus::DELIVERED);
});

test('delivered order cannot transition to another status', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::DELIVERED,
    ]);

    expect(fn () => app(SalesOrderStatusService::class)->transition(
        salesOrder: $order,
        toStatus: OrderStatus::CANCELLED,
        changedBy: $user->id,
    ))->toThrow(
        InvalidArgumentException::class,
        'Invalid order status transition'
    );
});

test('status transition history stores the reason', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::CONFIRMED,
    ]);

    app(SalesOrderStatusService::class)->transition(
        salesOrder: $order,
        toStatus: OrderStatus::PACKING,
        changedBy: $user->id,
        reason: 'Warehouse started packing.',
    );

    $history = SalesOrderStatusHistory::query()
        ->where('sales_order_id', $order->id)
        ->firstOrFail();

    expect($history->from_status)->toBe('CONFIRMED');
    expect($history->to_status)->toBe('PACKING');
    expect($history->changed_by)->toBe($user->id);
    expect($history->reason)->toBe('Warehouse started packing.');
});
