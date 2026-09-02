<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case ADMIN = 'ADMIN';
    case SALES = 'SALES';
    case WAREHOUSE = 'WAREHOUSE';
    case DELIVERY = 'DELIVERY';
}
