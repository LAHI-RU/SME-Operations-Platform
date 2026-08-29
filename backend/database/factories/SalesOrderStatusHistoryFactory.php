<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\SalesOrder;
use App\Models\SalesOrderStatusHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SalesOrderStatusHistory>
 */
class SalesOrderStatusHistoryFactory extends Factory
{
    protected $model = SalesOrderStatusHistory::class;

    public function definition(): array
    {
        return [
            'sales_order_id' => SalesOrder::factory(),
            'from_status' => 'DRAFT',
            'to_status' => 'SUBMITTED',
            'changed_by' => User::factory(),
            'reason' => fake()->optional()->sentence(),
        ];
    }
}
