<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sales_order_id')
                ->unique()
                ->constrained('sales_orders')
                ->cascadeOnDelete();

            $table->string('status', 30)
                ->index();

            $table->foreignId('assigned_to')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->dateTime('assigned_at')
                ->nullable();

            $table->dateTime('out_for_delivery_at')
                ->nullable();

            $table->dateTime('delivered_at')
                ->nullable();

            $table->text('notes')
                ->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deliveries');
    }
};
