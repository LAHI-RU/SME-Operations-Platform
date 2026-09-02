<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\DeliveryStatus;
use App\Models\Delivery;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Delivery>
 */
class DeliveryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'sales_order_id' => SalesOrder::factory(),
            'status' => DeliveryStatus::PENDING,
            'assigned_to' => null,
            'assigned_at' => null,
            'out_for_delivery_at' => null,
            'delivered_at' => null,
            'notes' => null,
        ];
    }

    public function assigned(): static
    {
        return $this->state(function () {
            return [
                'status' => DeliveryStatus::ASSIGNED,
                'assigned_to' => User::factory(),
                'assigned_at' => now(),
            ];
        });
    }

    public function outForDelivery(): static
    {
        return $this->state(function () {
            return [
                'status' => DeliveryStatus::OUT_FOR_DELIVERY,
                'assigned_to' => User::factory(),
                'assigned_at' => now(),
                'out_for_delivery_at' => now(),
            ];
        });
    }

    public function delivered(): static
    {
        return $this->state(function () {
            return [
                'status' => DeliveryStatus::DELIVERED,
                'assigned_to' => User::factory(),
                'assigned_at' => now(),
                'out_for_delivery_at' => now(),
                'delivered_at' => now(),
            ];
        });
    }
}
