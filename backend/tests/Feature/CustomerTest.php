<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

test('customers can be listed', function () {
    Customer::factory()->count(3)->create();

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/customers');

    $response
        ->assertSuccessful()
        ->assertJsonCount(3, 'data');
});

test('a customer can be created', function () {
    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/customers', [
            'name' => 'ABC Fashion',
            'phone' => '0712345678',
            'email' => 'abc@example.com',
            'address' => 'Kandy',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.name', 'ABC Fashion')
        ->assertJsonPath('data.customer_code', 'CUS-000001')
        ->assertJsonPath('data.is_active', true);

    $this->assertDatabaseHas('customers', [
        'customer_code' => 'CUS-000001',
        'name' => 'ABC Fashion',
    ]);
});

test('customer requires a name and phone', function () {
    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/customers', []);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'name',
            'phone',
        ]);
});

test('customer email must be valid', function () {
    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/customers', [
            'name' => 'ABC Fashion',
            'phone' => '0712345678',
            'email' => 'invalid-email',
        ]);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

test('a customer can be updated', function () {
    $customer = Customer::factory()->create();

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->putJson("/api/v1/customers/{$customer->id}", [
            'name' => 'Updated Customer',
            'phone' => '0777777777',
            'email' => 'updated@example.com',
            'address' => 'Colombo',
            'is_active' => false,
        ]);

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.name', 'Updated Customer')
        ->assertJsonPath('data.is_active', false);

    $this->assertDatabaseHas('customers', [
        'id' => $customer->id,
        'name' => 'Updated Customer',
        'is_active' => false,
    ]);
});

test('a customer can be deleted', function () {
    $customer = Customer::factory()->create();

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/customers/{$customer->id}");

    $response
        ->assertSuccessful()
        ->assertJsonPath('success', true);

    $this->assertDatabaseMissing('customers', [
        'id' => $customer->id,
    ]);
});

it('allows an admin to create a customer', function () {
    $admin = User::factory()->create([
        'role' => UserRole::ADMIN,
    ]);

    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/customers', [
            'name' => 'Admin Customer',
            'phone' => '0771234567',
            'email' => 'admin.customer@example.com',
        ])
        ->assertCreated();
});

it('allows a sales user to create a customer', function () {
    $sales = User::factory()->create([
        'role' => UserRole::SALES,
    ]);

    $this->actingAs($sales, 'sanctum')
        ->postJson('/api/v1/customers', [
            'name' => 'Sales Customer',
            'phone' => '0771234568',
            'email' => 'sales.customer@example.com',
        ])
        ->assertCreated();
});

it('prevents a warehouse user from creating a customer', function () {
    $warehouse = User::factory()->create([
        'role' => UserRole::WAREHOUSE,
    ]);

    $this->actingAs($warehouse, 'sanctum')
        ->postJson('/api/v1/customers', [
            'name' => 'Warehouse Customer',
            'phone' => '0771234569',
            'email' => 'warehouse.customer@example.com',
        ])
        ->assertForbidden();
});

it('prevents a sales user from deleting a customer', function () {
    $sales = User::factory()->create([
        'role' => UserRole::SALES,
    ]);

    $customer = Customer::factory()->create();

    $this->actingAs($sales, 'sanctum')
        ->deleteJson("/api/v1/customers/{$customer->id}")
        ->assertForbidden();
});
