<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SalesOrder;

class SalesOrderNumberService
{
    public function generate(): string
    {
        $nextId = (SalesOrder::query()->max('id') ?? 0) + 1;

        return sprintf('ORD-%06d', $nextId);
    }
}
