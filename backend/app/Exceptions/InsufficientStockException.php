<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

class InsufficientStockException extends RuntimeException
{
    public function __construct(
        int $available,
        int $requested,
    ) {
        parent::__construct(
            "Insufficient stock. Available: {$available}, requested: {$requested}."
        );
    }
}
