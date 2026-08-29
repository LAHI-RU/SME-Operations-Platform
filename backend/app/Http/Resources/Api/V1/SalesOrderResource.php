<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SalesOrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status,

            'customer' => [
                'id' => $this->customer?->id,
                'customer_code' => $this->customer?->customer_code,
                'name' => $this->customer?->name,
            ],

            'items' => $this->items->map(
                fn ($item) => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'sku' => $item->product?->sku,
                    'product_name' => $item->product?->name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'subtotal' => $item->subtotal,
                ]
            ),

            'total_amount' => $this->total_amount,
            'notes' => $this->notes,
            'order_date' => $this->order_date?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
