<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\SalesOrder;
use App\Models\User;

class SalesOrderPolicy
{
    public function assignDelivery(
        User $user,
        SalesOrder $salesOrder,
    ): bool {
        return in_array(
            $user->role,
            [
                UserRole::ADMIN,
                UserRole::SALES,
            ],
            true,
        );
    }

    public function startDelivery(
        User $user,
        SalesOrder $salesOrder,
    ): bool {
        return in_array(
            $user->role,
            [
                UserRole::ADMIN,
                UserRole::DELIVERY,
            ],
            true,
        );
    }

    public function completeDelivery(
        User $user,
        SalesOrder $salesOrder,
    ): bool {
        return in_array(
            $user->role,
            [
                UserRole::ADMIN,
                UserRole::DELIVERY,
            ],
            true,
        );
    }

    public function viewDelivery(
        User $user,
        SalesOrder $salesOrder,
    ): bool {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array(
            $user->role,
            [
                UserRole::ADMIN,
                UserRole::SALES,
            ],
            true,
        );
    }

    public function submit(
        User $user,
        SalesOrder $salesOrder,
    ): bool {
        return in_array(
            $user->role,
            [
                UserRole::ADMIN,
                UserRole::SALES,
            ],
            true,
        );
    }

    public function confirm(
        User $user,
        SalesOrder $salesOrder,
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

    public function view(
        User $user,
        SalesOrder $salesOrder,
    ): bool {
        return true;
    }

    public function startFulfillment(
        User $user,
        SalesOrder $salesOrder,
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

    public function completeFulfillment(
        User $user,
        SalesOrder $salesOrder,
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
}
