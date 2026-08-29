<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table): void {
            $table->id();

            $table->string('customer_code', 30)->unique();
            $table->string('name', 150);
            $table->string('phone', 30);
            $table->string('email', 255)->nullable();
            $table->text('address')->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index('name');
            $table->index('phone');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
