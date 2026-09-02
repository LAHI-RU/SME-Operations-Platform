<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\FulfillmentStatus;
use App\Models\Fulfillment;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Fulfillment>
 */
class FulfillmentFactory extends Factory
{
    protected $model = Fulfillment::class;

    public function definition(): array
    {
        return [
            'sales_order_id' => SalesOrder::factory(),
            'status' => FulfillmentStatus::IN_PROGRESS,
            'started_at' => now(),
            'completed_at' => null,
            'packed_by' => User::factory(),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
