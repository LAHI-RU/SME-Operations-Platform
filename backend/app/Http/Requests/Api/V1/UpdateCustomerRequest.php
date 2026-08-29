<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:150',
            ],
            'phone' => [
                'required',
                'string',
                'max:30',
            ],
            'email' => [
                'nullable',
                'email',
                'max:255',
            ],
            'address' => [
                'nullable',
                'string',
                'max:2000',
            ],
            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ];
    }
}
