<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\FulfillmentResource;
use App\Models\Fulfillment;
use App\Models\SalesOrder;
use App\Services\FulfillmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class FulfillmentController extends Controller
{
    public function start(
        Request $request,
        SalesOrder $salesOrder,
        FulfillmentService $fulfillmentService,
    ): FulfillmentResource {
        $fulfillment = $salesOrder->fulfillment;

        if (! $fulfillment) {
            $fulfillment = new Fulfillment([
                'sales_order_id' => $salesOrder->id,
            ]);
        }

        Gate::authorize('startFulfillment', $salesOrder);

        $fulfillment = $fulfillmentService->start(
            salesOrder: $salesOrder,
            packedBy: $request->user()->id,
        );

        return new FulfillmentResource($fulfillment);
    }

    public function complete(
        Request $request,
        SalesOrder $salesOrder,
        FulfillmentService $fulfillmentService,
    ): FulfillmentResource {
        $fulfillment = $salesOrder->fulfillment;

        if (! $fulfillment) {
            $fulfillment = new Fulfillment([
                'sales_order_id' => $salesOrder->id,
            ]);
        }

        Gate::authorize('completeFulfillment', $salesOrder);

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $fulfillment = $fulfillmentService->complete(
            salesOrder: $salesOrder,
            notes: $validated['notes'] ?? null,
        );

        return new FulfillmentResource($fulfillment);
    }
}
