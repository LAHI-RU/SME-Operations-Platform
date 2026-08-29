<?php

declare(strict_types=1);

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('customers can be listed', function () {
    Customer::factory()->count(3)->create();

    $response = $this->getJson('/api/v1/customers');

    $response
        ->assertSuccessful()
        ->assertJsonCount(3, 'data');
});

test('a customer can be created', function () {
    $response = $this->postJson('/api/v1/customers', [
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
    $response = $this->postJson('/api/v1/customers', []);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'name',
            'phone',
        ]);
});

test('customer email must be valid', function () {
    $response = $this->postJson('/api/v1/customers', [
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

    $response = $this->putJson("/api/v1/customers/{$customer->id}", [
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

    $response = $this->deleteJson(
        "/api/v1/customers/{$customer->id}"
    );

    $response
        ->assertSuccessful()
        ->assertJsonPath('success', true);

    $this->assertDatabaseMissing('customers', [
        'id' => $customer->id,
    ]);
});
