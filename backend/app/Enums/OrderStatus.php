<?php

declare(strict_types=1);

namespace App\Enums;

enum OrderStatus: string
{
    case DRAFT = 'DRAFT';
    case SUBMITTED = 'SUBMITTED';
    case PENDING_STOCK = 'PENDING_STOCK';
    case CONFIRMED = 'CONFIRMED';
    case PACKING = 'PACKING';
    case READY_FOR_DELIVERY = 'READY_FOR_DELIVERY';
    case ASSIGNED = 'ASSIGNED';
    case OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY';
    case DELIVERED = 'DELIVERED';
    case CANCELLED = 'CANCELLED';
}
