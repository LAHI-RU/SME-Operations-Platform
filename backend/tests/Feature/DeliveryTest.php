<?php

declare(strict_types=1);

use App\Enums\DeliveryStatus;
use App\Enums\OrderStatus;
use App\Models\SalesOrder;
use App\Models\User;
use App\Services\DeliveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createReadyForDeliveryOrderForDeliveryTest(): array
{
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::READY_FOR_DELIVERY,
    ]);

    return [
        'user' => $user,
        'order' => $order,
    ];
}

test('a ready for delivery order can be assigned', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $delivery = app(DeliveryService::class)->assign(
        salesOrder: $data['order'],
        assignedTo: $data['user']->id,
        changedBy: $data['user']->id,
    );

    expect($delivery->status)->toBe(
        DeliveryStatus::ASSIGNED
    );

    expect($delivery->assigned_to)->toBe(
        $data['user']->id
    );

    expect($delivery->assigned_at)->not->toBeNull();

    expect($data['order']->refresh()->status)->toBe(
        OrderStatus::ASSIGNED
    );

    $this->assertDatabaseHas('deliveries', [
        'sales_order_id' => $data['order']->id,
        'status' => 'ASSIGNED',
        'assigned_to' => $data['user']->id,
    ]);

    $this->assertDatabaseHas('sales_order_status_histories', [
        'sales_order_id' => $data['order']->id,
        'from_status' => 'READY_FOR_DELIVERY',
        'to_status' => 'ASSIGNED',
        'changed_by' => $data['user']->id,
    ]);
});

test('only ready for delivery orders can be assigned', function () {
    $user = User::factory()->create();

    $order = SalesOrder::factory()->create([
        'status' => OrderStatus::PACKING,
    ]);

    expect(fn () => app(DeliveryService::class)->assign(
        salesOrder: $order,
        assignedTo: $user->id,
        changedBy: $user->id,
    ))->toThrow(
        RuntimeException::class,
        'Only orders ready for delivery can be assigned.'
    );
});

test('a delivery cannot be assigned twice', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $service = app(DeliveryService::class);

    $service->assign(
        salesOrder: $data['order'],
        assignedTo: $data['user']->id,
        changedBy: $data['user']->id,
    );

    expect(fn () => $service->assign(
        salesOrder: $data['order']->refresh(),
        assignedTo: $data['user']->id,
        changedBy: $data['user']->id,
    ))->toThrow(
        RuntimeException::class,
        'Delivery has already been assigned.'
    );
});

test('an assigned delivery can start delivery', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $service = app(DeliveryService::class);

    $service->assign(
        salesOrder: $data['order'],
        assignedTo: $data['user']->id,
        changedBy: $data['user']->id,
    );

    $delivery = $service->start(
        salesOrder: $data['order']->refresh(),
        changedBy: $data['user']->id,
    );

    expect($delivery->status)->toBe(
        DeliveryStatus::OUT_FOR_DELIVERY
    );

    expect($delivery->out_for_delivery_at)->not->toBeNull();

    expect($data['order']->refresh()->status)->toBe(
        OrderStatus::OUT_FOR_DELIVERY
    );
});

test('delivery cannot start before it is assigned', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    expect(fn () => app(DeliveryService::class)->start(
        salesOrder: $data['order'],
        changedBy: $data['user']->id,
    ))->toThrow(
        RuntimeException::class,
        'Delivery has not been assigned.'
    );
});

test('an out for delivery delivery can be completed', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $service = app(DeliveryService::class);

    $service->assign(
        salesOrder: $data['order'],
        assignedTo: $data['user']->id,
        changedBy: $data['user']->id,
    );

    $service->start(
        salesOrder: $data['order']->refresh(),
        changedBy: $data['user']->id,
    );

    $delivery = $service->complete(
        salesOrder: $data['order']->refresh(),
        changedBy: $data['user']->id,
        notes: 'Delivered successfully.',
    );

    expect($delivery->status)->toBe(
        DeliveryStatus::DELIVERED
    );

    expect($delivery->delivered_at)->not->toBeNull();

    expect($delivery->notes)->toBe(
        'Delivered successfully.'
    );

    expect($data['order']->refresh()->status)->toBe(
        OrderStatus::DELIVERED
    );
});

test('delivery cannot be completed before going out for delivery', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $service = app(DeliveryService::class);

    $service->assign(
        salesOrder: $data['order'],
        assignedTo: $data['user']->id,
        changedBy: $data['user']->id,
    );

    expect(fn () => $service->complete(
        salesOrder: $data['order']->refresh(),
        changedBy: $data['user']->id,
    ))->toThrow(
        RuntimeException::class,
        'Only deliveries currently out for delivery can be completed.'
    );
});

test('a delivered order cannot be completed again', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $service = app(DeliveryService::class);

    $service->assign(
        salesOrder: $data['order'],
        assignedTo: $data['user']->id,
        changedBy: $data['user']->id,
    );

    $service->start(
        salesOrder: $data['order']->refresh(),
        changedBy: $data['user']->id,
    );

    $service->complete(
        salesOrder: $data['order']->refresh(),
        changedBy: $data['user']->id,
    );

    expect(fn () => $service->complete(
        salesOrder: $data['order']->refresh(),
        changedBy: $data['user']->id,
    ))->toThrow(
        RuntimeException::class,
        'Only deliveries currently out for delivery can be completed.'
    );
});

test('an authenticated user can assign a delivery through the API', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $this->actingAs($data['user'], 'sanctum');

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/delivery/assign",
        [
            'assigned_to' => $data['user']->id,
        ],
    );

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.status', 'ASSIGNED')
        ->assertJsonPath('data.assigned_to', $data['user']->id);

    expect($data['order']->refresh()->status)->toBe(
        OrderStatus::ASSIGNED
    );
});

test('an unauthenticated user cannot assign a delivery', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/delivery/assign",
        [
            'assigned_to' => $data['user']->id,
        ],
    );

    $response->assertUnauthorized();
});

test('an authenticated user can start delivery through the API', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $this->actingAs($data['user'], 'sanctum');

    app(DeliveryService::class)->assign(
        salesOrder: $data['order'],
        assignedTo: $data['user']->id,
        changedBy: $data['user']->id,
    );

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/delivery/start",
    );

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.status', 'OUT_FOR_DELIVERY');

    expect($data['order']->refresh()->status)->toBe(
        OrderStatus::OUT_FOR_DELIVERY
    );
});

test('an authenticated user can complete delivery through the API', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $this->actingAs($data['user'], 'sanctum');

    $service = app(DeliveryService::class);

    $service->assign(
        salesOrder: $data['order'],
        assignedTo: $data['user']->id,
        changedBy: $data['user']->id,
    );

    $service->start(
        salesOrder: $data['order']->refresh(),
        changedBy: $data['user']->id,
    );

    $response = $this->postJson(
        "/api/v1/orders/{$data['order']->id}/delivery/complete",
        [
            'notes' => 'Delivered to customer.',
        ],
    );

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.status', 'DELIVERED')
        ->assertJsonPath('data.notes', 'Delivered to customer.');

    expect($data['order']->refresh()->status)->toBe(
        OrderStatus::DELIVERED
    );
});

test('an authenticated user can view order delivery through the API', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $this->actingAs($data['user'], 'sanctum');

    app(DeliveryService::class)->assign(
        salesOrder: $data['order'],
        assignedTo: $data['user']->id,
        changedBy: $data['user']->id,
    );

    $response = $this->getJson(
        "/api/v1/orders/{$data['order']->id}/delivery",
    );

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.sales_order_id', $data['order']->id)
        ->assertJsonPath('data.status', 'ASSIGNED')
        ->assertJsonPath('data.assigned_to', $data['user']->id);
});

test('an unauthenticated user cannot view order delivery', function () {
    $data = createReadyForDeliveryOrderForDeliveryTest();

    $response = $this->getJson(
        "/api/v1/orders/{$data['order']->id}/delivery",
    );

    $response->assertUnauthorized();
});
