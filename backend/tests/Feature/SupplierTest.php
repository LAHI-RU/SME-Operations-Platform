<?php

declare(strict_types=1);

use App\Models\Supplier;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('suppliers can be listed', function () {
    Supplier::factory()->count(3)->create();

    $response = $this->getJson('/api/v1/suppliers');

    $response
        ->assertSuccessful()
        ->assertJsonCount(3, 'data');
});

test('a supplier can be created', function () {
    $response = $this->postJson('/api/v1/suppliers', [
        'name' => 'Lanka Textile Suppliers',
        'contact_person' => 'Nimal Perera',
        'phone' => '0712345678',
        'email' => 'supplier@example.com',
        'address' => 'Colombo',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.name', 'Lanka Textile Suppliers')
        ->assertJsonPath('data.supplier_code', 'SUP-000001')
        ->assertJsonPath('data.is_active', true);

    $this->assertDatabaseHas('suppliers', [
        'supplier_code' => 'SUP-000001',
        'name' => 'Lanka Textile Suppliers',
    ]);
});

test('supplier requires a name and phone', function () {
    $response = $this->postJson('/api/v1/suppliers', []);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'name',
            'phone',
        ]);
});

test('supplier email must be valid', function () {
    $response = $this->postJson('/api/v1/suppliers', [
        'name' => 'Lanka Textile Suppliers',
        'phone' => '0712345678',
        'email' => 'invalid-email',
    ]);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

test('a supplier can be updated', function () {
    $supplier = Supplier::factory()->create();

    $response = $this->putJson("/api/v1/suppliers/{$supplier->id}", [
        'name' => 'Updated Supplier',
        'contact_person' => 'Updated Contact',
        'phone' => '0777777777',
        'email' => 'updated@example.com',
        'address' => 'Kandy',
        'is_active' => false,
    ]);

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.name', 'Updated Supplier')
        ->assertJsonPath('data.is_active', false);

    $this->assertDatabaseHas('suppliers', [
        'id' => $supplier->id,
        'name' => 'Updated Supplier',
        'is_active' => false,
    ]);
});

test('a supplier can be deleted', function () {
    $supplier = Supplier::factory()->create();

    $response = $this->deleteJson(
        "/api/v1/suppliers/{$supplier->id}"
    );

    $response
        ->assertSuccessful()
        ->assertJsonPath('success', true);

    $this->assertDatabaseMissing('suppliers', [
        'id' => $supplier->id,
    ]);
});
