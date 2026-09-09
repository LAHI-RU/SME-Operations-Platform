<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCategoryRequest;
use App\Http\Requests\Api\V1\UpdateCategoryRequest;
use App\Http\Resources\Api\V1\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class CategoryController extends Controller
{
    public function index()
    {
        Gate::authorize('viewAny', Category::class);

        $categories = Category::query()
            ->latest('id')
            ->paginate(15);

        return CategoryResource::collection($categories);
    }

    public function store(StoreCategoryRequest $request): CategoryResource
    {
        Gate::authorize('create', Category::class);

        $category = Category::create([
            ...$request->validated(),
            'is_active' => true,
        ]);

        return new CategoryResource($category->refresh());
    }

    public function show(Category $category): CategoryResource
    {
        Gate::authorize('view', $category);

        return new CategoryResource($category);
    }

    public function update(
        UpdateCategoryRequest $request,
        Category $category,
    ): CategoryResource {
        Gate::authorize('update', $category);

        $category->update($request->validated());

        return new CategoryResource($category->refresh());
    }

    public function destroy(Category $category): JsonResponse
    {
        Gate::authorize('delete', $category);

        if ($category->products()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Category cannot be deleted because it has products.',
            ], 409);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully.',
            'data' => null,
        ]);
    }
}
