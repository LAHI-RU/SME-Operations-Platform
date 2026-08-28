<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCategoryRequest;
use App\Http\Requests\Api\V1\UpdateCategoryRequest;
use App\Http\Resources\Api\V1\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::query()
            ->latest('id')
            ->paginate(15);

        return CategoryResource::collection($categories);
    }

    public function store(StoreCategoryRequest $request): CategoryResource
    {
        $category = Category::create([
            ...$request->validated(),
            'is_active' => true,
        ]);

        return new CategoryResource($category->refresh());
    }

    public function show(Category $category): CategoryResource
    {
        return new CategoryResource($category);
    }

    public function update(
        UpdateCategoryRequest $request,
        Category $category,
    ): CategoryResource {
        $category->update($request->validated());

        return new CategoryResource($category->refresh());
    }

    public function destroy(Category $category): JsonResponse
    {
        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully.',
            'data' => null,
        ]);
    }
}
