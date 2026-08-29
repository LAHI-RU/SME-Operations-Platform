<?php

declare(strict_types=1);

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

test('products can be listed', function () {
    Product::factory()->count(3)->create();

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/products');

    $response
        ->assertSuccessful()
        ->assertJsonCount(3, 'data');
});

test('a product can be created', function () {
    $category = Category::factory()->create([
        'name' => 'Polo Shirts',
    ]);

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/products', [
            'category_id' => $category->id,
            'sku' => 'POL-BLU-001',
            'name' => 'Blue Polo Shirt',
            'description' => 'Blue polo shirt',
            'cost_price' => 2400,
            'selling_price' => 3500,
            'reorder_level' => 10,
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.sku', 'POL-BLU-001')
        ->assertJsonPath('data.name', 'Blue Polo Shirt')
        ->assertJsonPath('data.category.id', $category->id)
        ->assertJsonPath('data.is_active', true);

    $this->assertDatabaseHas('products', [
        'sku' => 'POL-BLU-001',
        'category_id' => $category->id,
    ]);
});

test('product sku must be unique', function () {
    $category = Category::factory()->create();

    Product::factory()->create([
        'category_id' => $category->id,
        'sku' => 'POL-BLU-001',
    ]);

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/products', [
            'category_id' => $category->id,
            'sku' => 'POL-BLU-001',
            'name' => 'Another Product',
            'cost_price' => 1000,
            'selling_price' => 1500,
            'reorder_level' => 5,
        ]);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['sku']);
});

test('product category must exist', function () {
    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/products', [
            'category_id' => 999999,
            'sku' => 'POL-BLU-002',
            'name' => 'Blue Polo Shirt',
            'cost_price' => 2400,
            'selling_price' => 3500,
            'reorder_level' => 10,
        ]);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['category_id']);
});

test('a product can be updated', function () {
    $category = Category::factory()->create();

    $product = Product::factory()->create([
        'category_id' => $category->id,
        'sku' => 'POL-BLU-001',
        'name' => 'Blue Polo Shirt',
    ]);

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->putJson("/api/v1/products/{$product->id}", [
            'category_id' => $category->id,
            'sku' => 'POL-BLU-001',
            'name' => 'Blue Polo Shirt Premium',
            'description' => 'Updated product',
            'cost_price' => 2500,
            'selling_price' => 3800,
            'reorder_level' => 12,
            'is_active' => false,
        ]);

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.name', 'Blue Polo Shirt Premium')
        ->assertJsonPath('data.is_active', false);

    $this->assertDatabaseHas('products', [
        'id' => $product->id,
        'name' => 'Blue Polo Shirt Premium',
        'is_active' => false,
    ]);
});

test('a product can be deleted', function () {
    $product = Product::factory()->create();

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/products/{$product->id}");

    $response
        ->assertSuccessful()
        ->assertJsonPath('success', true);

    $this->assertDatabaseMissing('products', [
        'id' => $product->id,
    ]);
});
