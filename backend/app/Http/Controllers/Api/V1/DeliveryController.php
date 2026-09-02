<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Delivery\AssignDeliveryRequest;
use App\Models\SalesOrder;
use App\Services\DeliveryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryController extends Controller
{
    public function __construct(
        private readonly DeliveryService $deliveryService,
    ) {}

    public function assign(
        AssignDeliveryRequest $request,
        SalesOrder $salesOrder,
    ): JsonResponse {
        $delivery = $this->deliveryService->assign(
            salesOrder: $salesOrder,
            assignedTo: (int) $request->validated('assigned_to'),
            changedBy: (int) $request->user()->id,
        );

        return response()->json([
            'data' => $delivery,
        ], 200);
    }

    public function start(
        Request $request,
        SalesOrder $salesOrder,
    ): JsonResponse {
        $delivery = $this->deliveryService->start(
            salesOrder: $salesOrder,
            changedBy: (int) $request->user()->id,
        );

        return response()->json([
            'data' => $delivery,
        ], 200);
    }

    public function complete(
        Request $request,
        SalesOrder $salesOrder,
    ): JsonResponse {
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $delivery = $this->deliveryService->complete(
            salesOrder: $salesOrder,
            changedBy: (int) $request->user()->id,
            notes: $validated['notes'] ?? null,
        );

        return response()->json([
            'data' => $delivery,
        ], 200);
    }

    public function show(
        SalesOrder $salesOrder,
    ): JsonResponse {
        $delivery = $salesOrder->delivery;

        if (! $delivery) {
            return response()->json([
                'message' => 'Delivery has not been created for this order.',
            ], 404);
        }

        return response()->json([
            'data' => $delivery,
        ], 200);
    }
}
