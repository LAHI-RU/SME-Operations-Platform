<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\FulfillmentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fulfillment extends Model
{
    use HasFactory;

    protected $fillable = [
        'sales_order_id',
        'status',
        'started_at',
        'completed_at',
        'packed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => FulfillmentStatus::class,
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function packedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'packed_by');
    }
}
