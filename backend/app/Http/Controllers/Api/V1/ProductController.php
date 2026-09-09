<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreProductRequest;
use App\Http\Requests\Api\V1\UpdateProductRequest;
use App\Http\Resources\Api\V1\ProductResource;
use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ProductController extends Controller
{
    public function index()
    {
        Gate::authorize('viewAny', Product::class);

        $products = Product::query()
            ->with(['category', 'inventory'])
            ->latest('id')
            ->paginate(15);

        return ProductResource::collection($products);
    }

    public function store(StoreProductRequest $request): ProductResource
    {
        Gate::authorize('create', Product::class);

        $product = \DB::transaction(function () use ($request): Product {
            $product = Product::create([
                ...$request->validated(),
                'is_active' => true,
            ]);

            Inventory::query()->create([
                'product_id' => $product->id,
                'quantity' => 0,
            ]);

            return $product
                ->refresh()
                ->load('category', 'inventory');
        });

        return new ProductResource($product);
    }

    public function show(Product $product): ProductResource
    {
        Gate::authorize('view', $product);

        return new ProductResource(
            $product->load(['category', 'inventory'])
        );
    }

    public function update(
        UpdateProductRequest $request,
        Product $product,
    ): ProductResource {
        Gate::authorize('update', $product);

        $product->update($request->validated());

        return new ProductResource(
            $product->refresh()->load('category')
        );
    }

    public function destroy(Product $product): JsonResponse
    {
        Gate::authorize('delete', $product);

        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully.',
            'data' => null,
        ]);
    }
}
