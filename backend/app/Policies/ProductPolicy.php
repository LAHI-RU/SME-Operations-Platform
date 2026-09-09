<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Product $product): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, [
            UserRole::ADMIN,
            UserRole::WAREHOUSE,
        ], true);
    }

    public function update(User $user, Product $product): bool
    {
        return in_array($user->role, [
            UserRole::ADMIN,
            UserRole::WAREHOUSE,
        ], true);
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->hasRole(UserRole::ADMIN);
    }
}
