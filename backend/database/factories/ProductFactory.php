<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),

            'sku' => fake()->unique()->bothify('SKU-####-????'),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),

            'cost_price' => fake()->randomFloat(2, 100, 5000),
            'selling_price' => fake()->randomFloat(2, 100, 10000),

            'reorder_level' => fake()->numberBetween(0, 100),

            'is_active' => true,
        ];
    }
}
