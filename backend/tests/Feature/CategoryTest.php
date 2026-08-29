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

test('categories can be listed', function () {
    Category::factory()->count(3)->create();

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/categories');

    $response
        ->assertSuccessful()
        ->assertJsonCount(3, 'data');
});

test('a category can be created', function () {
    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/categories', [
            'name' => 'Polo Shirts',
            'description' => 'Polo shirts and related products',
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.name', 'Polo Shirts')
        ->assertJsonPath('data.is_active', true);

    $this->assertDatabaseHas('categories', [
        'name' => 'Polo Shirts',
    ]);
});

test('category name must be unique', function () {
    Category::factory()->create([
        'name' => 'Polo Shirts',
    ]);

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/categories', [
            'name' => 'Polo Shirts',
        ]);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);
});

test('a category can be updated', function () {
    $category = Category::factory()->create([
        'name' => 'Polo Shirts',
    ]);

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->putJson("/api/v1/categories/{$category->id}", [
            'name' => 'Polo Shirts & Tops',
            'description' => 'Updated description',
            'is_active' => false,
        ]);

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.name', 'Polo Shirts & Tops')
        ->assertJsonPath('data.is_active', false);

    $this->assertDatabaseHas('categories', [
        'id' => $category->id,
        'name' => 'Polo Shirts & Tops',
        'is_active' => false,
    ]);
});

test('a category with products cannot be deleted', function () {
    $category = Category::factory()->create();

    Product::factory()->create([
        'category_id' => $category->id,
    ]);

    $response = $this
        ->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/categories/{$category->id}");

    $response
        ->assertStatus(409)
        ->assertJsonPath(
            'message',
            'Category cannot be deleted because it has products.'
        );

    $this->assertDatabaseHas('categories', [
        'id' => $category->id,
    ]);
});
