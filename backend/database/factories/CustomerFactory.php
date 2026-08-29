<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        return [
            'customer_code' => fake()->unique()->bothify('CUS-######'),
            'name' => fake()->company(),
            'phone' => fake()->numerify('07########'),
            'email' => fake()->unique()->safeEmail(),
            'address' => fake()->address(),
            'is_active' => true,
        ];
    }
}
