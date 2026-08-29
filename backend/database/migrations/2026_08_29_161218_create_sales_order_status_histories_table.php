<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_order_status_histories', function (Blueprint $table): void {
            $table->id();

            $table->foreignId('sales_order_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('from_status', 30)->nullable();

            $table->string('to_status', 30);

            $table->foreignId('changed_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->text('reason')->nullable();

            $table->timestamps();

            $table->index([
                'sales_order_id',
                'created_at',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_order_status_histories');
    }
};
