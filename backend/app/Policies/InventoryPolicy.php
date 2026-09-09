<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Inventory;
use App\Models\User;

class InventoryPolicy
{
    public function view(
        User $user,
        Inventory $inventory,
    ): bool {
        return true;
    }

    public function stockIn(
        User $user,
        Inventory $inventory,
    ): bool {
        return in_array(
            $user->role,
            [
                UserRole::ADMIN,
                UserRole::WAREHOUSE,
            ],
            true,
        );
    }

    public function stockOut(
        User $user,
        Inventory $inventory,
    ): bool {
        return in_array(
            $user->role,
            [
                UserRole::ADMIN,
                UserRole::WAREHOUSE,
            ],
            true,
        );
    }

    public function transactions(
        User $user,
        Inventory $inventory,
    ): bool {
        return true;
    }
}
