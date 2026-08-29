<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Customer;

class CustomerCodeService
{
    public function generate(): string
    {
        $nextId = (Customer::query()->max('id') ?? 0) + 1;

        return sprintf('CUS-%06d', $nextId);
    }
}
