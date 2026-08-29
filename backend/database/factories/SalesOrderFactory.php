<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Customer;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SalesOrder>
 */
class SalesOrderFactory extends Factory
{
    protected $model = SalesOrder::class;

    public function definition(): array
    {
        return [
            'order_number' => fake()->unique()->bothify('ORD-######'),
            'customer_id' => Customer::factory(),
            'created_by' => User::factory(),
            'status' => 'DRAFT',
            'order_date' => now(),
            'total_amount' => 0,
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
