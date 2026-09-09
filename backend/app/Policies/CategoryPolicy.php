<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\User;

class CategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Category $category): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasRole(UserRole::ADMIN);
    }

    public function update(User $user, Category $category): bool
    {
        return $user->hasRole(UserRole::ADMIN);
    }

    public function delete(User $user, Category $category): bool
    {
        return $user->hasRole(UserRole::ADMIN);
    }
}
