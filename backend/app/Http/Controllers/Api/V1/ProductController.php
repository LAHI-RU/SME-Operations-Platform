<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreProductRequest;
use App\Http\Requests\Api\V1\UpdateProductRequest;
use App\Http\Resources\Api\V1\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::query()
            ->with('category')
            ->latest('id')
            ->paginate(15);

        return ProductResource::collection($products);
    }

    public function store(StoreProductRequest $request): ProductResource
    {
        $product = Product::create([
            ...$request->validated(),
            'is_active' => true,
        ]);

        return new ProductResource(
            $product->refresh()->load('category')
        );
    }

    public function show(Product $product): ProductResource
    {
        return new ProductResource(
            $product->load('category')
        );
    }

    public function update(
        UpdateProductRequest $request,
        Product $product,
    ): ProductResource {
        $product->update($request->validated());

        return new ProductResource(
            $product->refresh()->load('category')
        );
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully.',
            'data' => null,
        ]);
    }
}
