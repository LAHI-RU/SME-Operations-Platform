<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListSalesOrderRequest;
use App\Http\Requests\Api\V1\StoreSalesOrderRequest;
use App\Http\Resources\Api\V1\SalesOrderResource;
use App\Models\SalesOrder;
use App\Services\SalesOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesOrderController extends Controller
{
    public function index(ListSalesOrderRequest $request)
    {
        $data = $request->validated();

        $orders = SalesOrder::query()
            ->with(['customer', 'items.product'])
            ->when(
                $data['status'] ?? null,
                fn ($query, $status) => $query->where('status', $status)
            )
            ->when(
                $data['customer_id'] ?? null,
                fn ($query, $customerId) => $query->where(
                    'customer_id',
                    $customerId
                )
            )
            ->when(
                $data['search'] ?? null,
                function ($query, $search): void {
                    $query->where(function ($query) use ($search): void {
                        $query
                            ->where('order_number', 'ilike', "%{$search}%")
                            ->orWhereHas(
                                'customer',
                                fn ($customerQuery) => $customerQuery->where(
                                    'name',
                                    'ilike',
                                    "%{$search}%"
                                )
                            );
                    });
                }
            )
            ->latest('id')
            ->paginate($data['per_page'] ?? 15);

        return SalesOrderResource::collection($orders);
    }

    public function store(
        StoreSalesOrderRequest $request,
        SalesOrderService $salesOrderService,
    ): SalesOrderResource {
        $data = $request->validated();

        $order = $salesOrderService->createDraft(
            customerId: (int) $data['customer_id'],
            createdBy: (int) $request->user()->id,
            items: $data['items'],
            notes: $data['notes'] ?? null,
        );

        return new SalesOrderResource($order);
    }

    public function show(SalesOrder $salesOrder): SalesOrderResource
    {
        return new SalesOrderResource(
            $salesOrder->load('customer', 'items.product')
        );
    }

    public function submit(
        SalesOrder $salesOrder,
        SalesOrderService $salesOrderService,
    ): SalesOrderResource {
        $order = $salesOrderService->submit($salesOrder);

        return new SalesOrderResource(
            $order->load('customer', 'items.product')
        );
    }

    public function confirm(
        SalesOrder $salesOrder,
        SalesOrderService $salesOrderService,
        Request $request,
    ): SalesOrderResource|JsonResponse {
        try {
            $order = $salesOrderService->confirm(
                salesOrder: $salesOrder,
                createdBy: $request->user()?->id,
            );
        } catch (\RuntimeException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 409);
        }

        return new SalesOrderResource(
            $order->load('customer', 'items.product')
        );
    }
}
