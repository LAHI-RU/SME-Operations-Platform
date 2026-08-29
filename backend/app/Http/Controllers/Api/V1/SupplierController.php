<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreSupplierRequest;
use App\Http\Requests\Api\V1\UpdateSupplierRequest;
use App\Http\Resources\Api\V1\SupplierResource;
use App\Models\Supplier;
use App\Services\SupplierCodeService;
use Illuminate\Http\JsonResponse;

class SupplierController extends Controller
{
    public function index()
    {
        $suppliers = Supplier::query()
            ->latest('id')
            ->paginate(15);

        return SupplierResource::collection($suppliers);
    }

    public function store(
        StoreSupplierRequest $request,
        SupplierCodeService $codeService,
    ): SupplierResource {
        $supplier = Supplier::query()->create([
            ...$request->validated(),
            'supplier_code' => $codeService->generate(),
            'is_active' => true,
        ]);

        return new SupplierResource(
            $supplier->refresh()
        );
    }

    public function show(Supplier $supplier): SupplierResource
    {
        return new SupplierResource($supplier);
    }

    public function update(
        UpdateSupplierRequest $request,
        Supplier $supplier,
    ): SupplierResource {
        $supplier->update($request->validated());

        return new SupplierResource(
            $supplier->refresh()
        );
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => 'Supplier deleted successfully.',
            'data' => null,
        ]);
    }
}
