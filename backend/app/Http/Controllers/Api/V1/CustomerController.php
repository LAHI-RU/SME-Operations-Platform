<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCustomerRequest;
use App\Http\Requests\Api\V1\UpdateCustomerRequest;
use App\Http\Resources\Api\V1\CustomerResource;
use App\Models\Customer;
use App\Services\CustomerCodeService;
use Illuminate\Http\JsonResponse;

class CustomerController extends Controller
{
    public function index()
    {
        $customers = Customer::query()
            ->latest('id')
            ->paginate(15);

        return CustomerResource::collection($customers);
    }

    public function store(
        StoreCustomerRequest $request,
        CustomerCodeService $codeService,
    ): CustomerResource {
        $customer = Customer::query()->create([
            ...$request->validated(),
            'customer_code' => $codeService->generate(),
            'is_active' => true,
        ]);

        return new CustomerResource(
            $customer->refresh()
        );
    }

    public function show(Customer $customer): CustomerResource
    {
        return new CustomerResource($customer);
    }

    public function update(
        UpdateCustomerRequest $request,
        Customer $customer,
    ): CustomerResource {
        $customer->update($request->validated());

        return new CustomerResource(
            $customer->refresh()
        );
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $customer->delete();

        return response()->json([
            'success' => true,
            'message' => 'Customer deleted successfully.',
            'data' => null,
        ]);
    }
}
