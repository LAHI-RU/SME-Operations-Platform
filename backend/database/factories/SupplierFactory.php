<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Supplier>
 */
class SupplierFactory extends Factory
{
    protected $model = Supplier::class;

    public function definition(): array
    {
        return [
            'supplier_code' => fake()->unique()->bothify('SUP-######'),
            'name' => fake()->company(),
            'contact_person' => fake()->name(),
            'phone' => fake()->numerify('07########'),
            'email' => fake()->unique()->safeEmail(),
            'address' => fake()->address(),
            'is_active' => true,
        ];
    }
}
