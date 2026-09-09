<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\User;

class CustomerPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Customer $customer): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, [
            UserRole::ADMIN,
            UserRole::SALES,
        ], true);
    }

    public function update(User $user, Customer $customer): bool
    {
        return in_array($user->role, [
            UserRole::ADMIN,
            UserRole::SALES,
        ], true);
    }

    public function delete(User $user, Customer $customer): bool
    {
        return $user->hasRole(UserRole::ADMIN);
    }
}
