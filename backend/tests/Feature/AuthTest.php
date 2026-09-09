<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a user can log in', function (UserRole $role): void {
    $user = User::factory()->create([
        'email' => 'lahiru@example.com',
        'password' => bcrypt('password123'),
        'role' => $role,
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'lahiru@example.com',
        'password' => 'password123',
    ]);

    $response
        ->assertSuccessful()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.user.email', 'lahiru@example.com')
        ->assertJsonPath('data.user.role', $user->refresh()->role->value)
        ->assertJsonStructure([
            'data' => [
                'token',
            ],
        ]);
})->with([
    'admin' => [UserRole::ADMIN],
    'sales' => [UserRole::SALES],
]);

test('login fails with invalid credentials', function () {
    $user = User::factory()->create([
        'email' => 'lahiru@example.com',
        'password' => bcrypt('password123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'lahiru@example.com',
        'password' => 'wrong-password',
    ]);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

test('an authenticated user can view their profile', function (UserRole $role): void {
    $user = User::factory()->create([
        'role' => $role,
    ]);

    $response = $this
        ->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me');

    $response
        ->assertSuccessful()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.email', $user->email)
        ->assertJsonPath('data.role', $user->refresh()->role->value);
})->with([
    'admin' => [UserRole::ADMIN],
    'sales' => [UserRole::SALES],
]);

test('an unauthenticated user cannot access orders', function () {
    $response = $this->getJson('/api/v1/orders');

    $response->assertUnauthorized();
});

test('an authenticated user can logout', function () {
    $user = User::factory()->create();

    $token = $user->createToken('test')->plainTextToken;

    $response = $this
        ->withToken($token)
        ->postJson('/api/v1/auth/logout');

    $response
        ->assertSuccessful()
        ->assertJsonPath('success', true);

    expect($user->tokens()->count())->toBe(0);
});

test('an unauthenticated user cannot access products', function () {
    $response = $this->getJson('/api/v1/products');

    $response->assertUnauthorized();
});

test('an authenticated user can access products', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user, 'sanctum')
        ->getJson('/api/v1/products');

    $response->assertSuccessful();
});
