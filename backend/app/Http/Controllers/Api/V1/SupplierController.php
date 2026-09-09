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
use Illuminate\Support\Facades\Gate;

class SupplierController extends Controller
{
    public function index()
    {
        Gate::authorize('viewAny', Supplier::class);

        $suppliers = Supplier::query()
            ->latest('id')
            ->paginate(15);

        return SupplierResource::collection($suppliers);
    }

    public function store(
        StoreSupplierRequest $request,
        SupplierCodeService $codeService,
    ): SupplierResource {
        Gate::authorize('create', Supplier::class);

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
        Gate::authorize('view', $supplier);

        return new SupplierResource($supplier);
    }

    public function update(
        UpdateSupplierRequest $request,
        Supplier $supplier,
    ): SupplierResource {
        Gate::authorize('update', $supplier);

        $supplier->update($request->validated());

        return new SupplierResource(
            $supplier->refresh()
        );
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        Gate::authorize('delete', $supplier);

        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => 'Supplier deleted successfully.',
            'data' => null,
        ]);
    }
}
