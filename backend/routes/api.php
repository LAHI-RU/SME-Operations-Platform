<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\DeliveryController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\SalesOrderController;
use App\Http\Controllers\Api\V1\SupplierController;
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

    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        Route::get('/orders', [SalesOrderController::class, 'index']);
        Route::post('/orders', [SalesOrderController::class, 'store']);
        Route::get('/orders/{salesOrder}', [SalesOrderController::class, 'show']);

        Route::post(
            '/orders/{salesOrder}/submit',
            [SalesOrderController::class, 'submit']
        );

        Route::post(
            '/orders/{salesOrder}/confirm',
            [SalesOrderController::class, 'confirm']
        );

        Route::apiResource('categories', CategoryController::class);
        Route::apiResource('products', ProductController::class);
        Route::get(
            '/inventory/{product}',
            [InventoryController::class, 'show']
        );

        Route::post(
            '/inventory/{product}/stock-in',
            [InventoryController::class, 'stockIn']
        );

        Route::post(
            '/inventory/{product}/stock-out',
            [InventoryController::class, 'stockOut']
        );

        Route::get(
            '/inventory/{product}/transactions',
            [InventoryController::class, 'transactions']
        );

        Route::apiResource('customers', CustomerController::class);
        Route::apiResource('suppliers', SupplierController::class);

        Route::get('/orders', [SalesOrderController::class, 'index']);
        Route::post('/orders', [SalesOrderController::class, 'store']);
        Route::get('/orders/{salesOrder}', [SalesOrderController::class, 'show']);

        Route::post(
            '/orders/{salesOrder}/submit',
            [SalesOrderController::class, 'submit']
        );

        Route::post(
            '/orders/{salesOrder}/confirm',
            [SalesOrderController::class, 'confirm']
        );

        Route::post(
            'orders/{salesOrder}/delivery/assign',
            [DeliveryController::class, 'assign'],
        );

        Route::post(
            'orders/{salesOrder}/delivery/start',
            [DeliveryController::class, 'start'],
        );

        Route::post(
            'orders/{salesOrder}/delivery/complete',
            [DeliveryController::class, 'complete'],
        );

        Route::get(
            'orders/{salesOrder}/delivery',
            [DeliveryController::class, 'show'],
        );
    });
});
