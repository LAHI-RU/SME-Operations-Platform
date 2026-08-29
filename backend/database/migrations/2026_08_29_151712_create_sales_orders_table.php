<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_orders', function (Blueprint $table): void {
            $table->id();

            $table->string('order_number', 30)->unique();

            $table->foreignId('customer_id')
                ->constrained()
                ->restrictOnDelete();

            $table->foreignId('created_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->string('status', 30)->index();

            $table->dateTime('order_date');

            $table->decimal('total_amount', 14, 2);

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['customer_id', 'status']);
            $table->index('order_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_orders');
    }
};
