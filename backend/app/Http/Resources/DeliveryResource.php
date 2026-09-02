<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeliveryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sales_order_id' => $this->sales_order_id,
            'status' => $this->status->value,
            'assigned_to' => $this->assigned_to,
            'assigned_at' => $this->assigned_at?->toISOString(),
            'out_for_delivery_at' => $this->out_for_delivery_at?->toISOString(),
            'delivered_at' => $this->delivered_at?->toISOString(),
            'notes' => $this->notes,
        ];
    }
}
