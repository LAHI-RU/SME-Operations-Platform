<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class ListSalesOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => [
                'nullable',
                'string',
                'in:DRAFT,SUBMITTED,PENDING_STOCK,CONFIRMED,CANCELLED,PACKING,READY_FOR_DELIVERY,ASSIGNED,OUT_FOR_DELIVERY,DELIVERED',
            ],
            'customer_id' => [
                'nullable',
                'integer',
                'exists:customers,id',
            ],
            'search' => [
                'nullable',
                'string',
                'max:100',
            ],
            'per_page' => [
                'nullable',
                'integer',
                'min:1',
                'max:100',
            ],
        ];
    }
}
