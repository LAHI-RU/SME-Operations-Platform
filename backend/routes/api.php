<?php

use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\ProductController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', function () {
        return response()->json([
            'success' => true,
            'message' => 'API is healthy.',
            'data' => [
                'application' => config('app.name'),
                'environment' => app()->environment(),
            ],
        ]);
    });

    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('products', ProductController::class);
});
