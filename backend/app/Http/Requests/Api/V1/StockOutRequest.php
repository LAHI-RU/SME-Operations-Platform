<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StockOutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'quantity' => [
                'required',
                'integer',
                'min:1',
            ],
            'type' => [
                'required',
                'string',
                'in:SALE,ADJUSTMENT_OUT',
            ],
            'reference_type' => [
                'nullable',
                'string',
                'max:100',
            ],
            'reference_id' => [
                'nullable',
                'integer',
                'min:1',
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }
}
