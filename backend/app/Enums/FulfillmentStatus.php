<?php

declare(strict_types=1);

namespace App\Enums;

enum FulfillmentStatus: string
{
    case PENDING = 'PENDING';
    case IN_PROGRESS = 'IN_PROGRESS';
    case COMPLETED = 'COMPLETED';
}
