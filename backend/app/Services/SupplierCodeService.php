<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Supplier;

class SupplierCodeService
{
    public function generate(): string
    {
        $nextId = (Supplier::query()->max('id') ?? 0) + 1;

        return sprintf('SUP-%06d', $nextId);
    }
}
