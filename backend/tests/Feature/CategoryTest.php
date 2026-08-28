<?php

declare(strict_types=1);

use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('categories can be listed', function () {
    Category::factory()->count(3)->create();

    $response = $this->getJson('/api/v1/categories');

    $response
        ->assertSuccessful()
        ->assertJsonCount(3, 'data');
});

test('a category can be created', function () {
    $response = $this->postJson('/api/v1/categories', [
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

    $response = $this->postJson('/api/v1/categories', [
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

    $response = $this->putJson("/api/v1/categories/{$category->id}", [
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

test('a category can be deleted when it has no products', function () {
    $category = Category::factory()->create();

    $response = $this->deleteJson("/api/v1/categories/{$category->id}");

    $response
        ->assertSuccessful()
        ->assertJsonPath('success', true);

    $this->assertDatabaseMissing('categories', [
        'id' => $category->id,
    ]);
});
