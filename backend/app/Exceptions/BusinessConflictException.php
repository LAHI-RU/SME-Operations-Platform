<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * An expected business conflict whose message is safe to return to API clients.
 */
class BusinessConflictException extends RuntimeException {}
