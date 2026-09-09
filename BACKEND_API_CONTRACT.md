# Backend API contract

Inspected: 2026-09-09. Updated through sub-checkpoint 02.2: authentication exposes the stored role and known business conflicts return HTTP 409. No frontend code has been created.
Status: 02.1 and 02.2 implemented and verified; remaining Checkpoint 02 changes are pending.

## Evidence and verification

- Registered API routes: `php artisan route:list --path=api --no-interaction` succeeded, **39 routes**.
- Installed packages from `composer show --direct`: Laravel **13.29.0**, Sanctum **4.3.3**, Pest **4.7.8**. CLI PHP is 8.3.14.
- `php vendor/bin/pest --compact --testsuite=Feature`: **115 passed, 256 assertions** using SQLite `:memory:` (7.327 seconds).
- Sub-checkpoint 02.1 verification: the four new ADMIN/SALES role assertions failed before the controller change. Afterward, `php artisan test --compact tests/Feature/AuthTest.php` passed **9 tests / 29 assertions**, and `php artisan test` passed the complete suite with **118 tests / 269 assertions**, using SQLite `:memory:`. Both `php vendor/bin/pint --dirty --format agent` and `php vendor/bin/pint --test` passed.
- Sub-checkpoint 02.2 verification: the business-error HTTP tests and updated status-service tests first showed **14 expected failures / 11 passes**. After implementation, `php artisan test --compact tests/Feature/BusinessExceptionTest.php tests/Feature/SalesOrderStatusTest.php` passed **26 tests / 96 assertions**. The complete suite passed **133 tests / 346 assertions**, using SQLite `:memory:`. Pint formatting and `php vendor/bin/pint --test` passed. HTTP tests verify exact conflict envelopes even with debug enabled, unchanged data after rejected operations, validation 422, missing-order 404, and generic production 500 responses for unexpected failures. Existing authentication/authorization tests remain green.
- An initial Artisan test invocation forwarded `--no-interaction` to PHPUnit, which rejected it. The direct Pest invocation above corrected the command and passed.
- Sources: `backend/routes/api.php`, all API controllers, requests, resources, models, enums, policies and services, `backend/bootstrap/app.php`, auth/Sanctum configuration, and existing feature tests.
- Framework response details were checked against the installed `ResourceResponse`, `PaginatedResourceResponse`, `LengthAwarePaginator`, and exception handler source.
- This is not a live PostgreSQL HTTP capture or browser integration test. Existing tests cover selected API and service behavior, not every payload, permission combination, or failure response. Search and assignment isolation still need further coverage.

## Authentication contract

All domain endpoints require `auth:sanctum`. Public endpoints are login and health.

| Method and full path | Request | Success response |
| --- | --- | --- |
| `GET /api/v1/health` | None | `200`, `{success:true,message:"API is healthy.",data:{application,environment}}` |
| `POST /api/v1/auth/login` | Required `email` (email format), `password` (string) | `200`, `{success:true,message:"Login successful.",data:{user:{id,name,email,role},token}}` |
| `GET /api/v1/auth/me` | Bearer token | `200`, `{success:true,message:"Authenticated user.",data:{id,name,email,role}}` |
| `POST /api/v1/auth/logout` | Bearer token; no body | `200`, `{success:true,message:"Logout successful.",data:null}` |

Login creates a Sanctum personal access token named `react-client`. Subsequent requests use `Authorization: Bearer <token>` and should send `Accept: application/json`. JSON writes use `Content-Type: application/json`. Logout deletes the current access token, not all tokens. No token refresh endpoint exists. Sanctum's source configuration sets expiration to `null`, and login does not supply a per-token expiry.

Invalid credentials return **422**, with an `email` validation error: `The provided credentials are incorrect.` Missing/invalid authentication returns **401**.

**Login returns `data.user.role`; `/auth/me` returns `data.role`.** Both serialize `$user->role->value` from the existing `UserRole` enum: `ADMIN`, `SALES`, `WAREHOUSE`, or `DELIVERY`. HTTP tests cover ADMIN and SALES against the persisted user's role. Token creation, authentication, logout, and response envelopes are unchanged. The frontend may use this field for navigation and action visibility; backend policies remain authoritative. Do not infer roles from the opaque token.

The current login flow does not establish a browser session; `statefulApi()` is not enabled in `bootstrap/app.php`. There is no application CORS override; installed framework defaults allow all origins/methods/headers for API paths with `supports_credentials:false`. Browser behavior still needs actual verification.

Authentication storage is deliberately undecided at this checkpoint. Supporting the present bearer contract is the smallest integration; JavaScript-readable persistence carries token theft risk under XSS. A first-party HttpOnly session flow requires a deliberate backend/login, CSRF and CORS change. Evaluate these options before Phase 5; do not silently introduce localStorage persistence or assume cookie login already works.

## Endpoint inventory

All paths below are relative to **`/api/v1`**. Registered GET routes also support HEAD. IDs refer to Laravel route-bound models; missing models normally return 404.

For each of `categories`, `products`, `customers`, and `suppliers`:

| Method | Path | Result |
| --- | --- | --- |
| GET | `/{collection}` | Paginated resource collection, 200 |
| POST | `/{collection}` | Created resource, 201 |
| GET | `/{collection}/{id}` | Single resource, 200 |
| PUT or PATCH | `/{collection}/{id}` | Updated resource, 200 |
| DELETE | `/{collection}/{id}` | 200, `{success:true,message,data:null}` |

Route parameter names are `{category}`, `{product}`, `{customer}`, `{supplier}` respectively. PATCH is registered, but update validation still requires the mandatory fields; it is not a generally supported partial-update schema.

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| GET | `/inventory/{product}` | None | Inventory resource, normally 200; 201 if the read creates a missing inventory row |
| POST | `/inventory/{product}/stock-in` | Stock-in schema | Inventory resource, 200 |
| POST | `/inventory/{product}/stock-out` | Stock-out schema | Inventory resource, 200 |
| GET | `/inventory/{product}/transactions` | `page` | Paginated inventory transactions, 200 |
| GET | `/orders` | Supported filters below | Paginated order resources, 200 |
| POST | `/orders` | Draft-order schema | Order resource with `DRAFT`, 201 |
| GET | `/orders/{salesOrder}` | None | Order resource, 200 |
| POST | `/orders/{salesOrder}/submit` | No body | Order resource with `SUBMITTED`, 200 |
| POST | `/orders/{salesOrder}/confirm` | No body | Order resource with `CONFIRMED` **or `PENDING_STOCK`**, 200 |
| POST | `/orders/{salesOrder}/fulfillment/start` | No body | Fulfillment resource with `IN_PROGRESS`, 201 |
| POST | `/orders/{salesOrder}/fulfillment/complete` | Optional nullable `notes`, string max 2000 | Fulfillment resource with `COMPLETED`, 200 |
| GET | `/orders/{salesOrder}/delivery` | None | Delivery resource, 200; 404 if no delivery exists |
| POST | `/orders/{salesOrder}/delivery/assign` | Required integer `assigned_to`, existing user ID | Delivery resource with `ASSIGNED`, 201 |
| POST | `/orders/{salesOrder}/delivery/start` | No body | Delivery resource with `OUT_FOR_DELIVERY`, 200 |
| POST | `/orders/{salesOrder}/delivery/complete` | Optional nullable `notes`, string max 2000 | Delivery resource with `DELIVERED`, 200 |

Resource status codes above follow the installed framework's `wasRecentlyCreated` behavior; not all individual codes have dedicated assertions in the current tests.

Order routes are declared twice in `routes/api.php`; Laravel's effective route list contains one entry per method/URI. No routes exist for order update, order delete, cancellation, fulfillment reads, status-history reads, driver/user lookup, dashboard aggregation, or a global delivery list.

## Request schemas and validation

“Optional nullable” means the field may be omitted or sent as null. Frontend validation should mirror useful constraints; Laravel remains authoritative.

| Resource | Required fields on create **and update** | Optional nullable fields |
| --- | --- | --- |
| Category | `name`: string max 100, unique across categories; update ignores current record | `description`: string max 1000 |
| Product | `category_id`: integer, existing category; `sku`: string max 50, unique, update ignores current record; `name`: string max 150; `cost_price`, `selling_price`: numeric >= 0; `reorder_level`: integer >= 0 | `description`: string max 2000 |
| Customer | `name`: string max 150; `phone`: string max 30 | `email`: valid email max 255; `address`: string max 2000 |
| Supplier | `name`: string max 150; `phone`: string max 30 | `contact_person`: string max 150; `email`: valid email max 255; `address`: string max 2000 |

Each update also accepts optional `is_active` with Laravel boolean validation. Creation sets `is_active:true` on the server. Customer/supplier codes are server-generated; do not submit them. Product creation initializes zero inventory. Price validation has no explicit decimal-place maximum or cost-versus-selling-price rule. Existence checks do not require referenced records to be active.

Stock-in and stock-out both require:

- `quantity`: integer >= 1, always positive in the request.
- `type`: stock-in accepts `PURCHASE`, `RETURN`, `ADJUSTMENT_IN`; stock-out accepts `SALE`, `ADJUSTMENT_OUT`.
- Optional nullable `reference_type`: string max 100; `reference_id`: integer >= 1; `notes`: string max 1000.
- Reference fields do not validate the existence of the referenced business record.

Draft order creation requires:

- `customer_id`: integer, existing customer.
- `items`: array with at least one item.
- `items.*.product_id`: integer, existing product, distinct across items.
- `items.*.quantity`: integer >= 1.
- Optional nullable `notes`: string max 2000.

Do not submit order status, prices, totals, creator, order number or order date. The service obtains selling prices from products and calculates stored totals. UI totals will be previews only.

Delivery assignment validates that `assigned_to` exists in `users`; it **does not require the DELIVERY role**. There is no API for populating a driver selector.

## Response schemas

Resource responses use `{data: resource}` without `success` or `message`. Auth and delete responses use `{success,message,data}`. The `ApiResponse` helper exists but is not used consistently by the inspected controllers. Do not assume one universal envelope.

Types: IDs and quantities are JSON integers under the current model/database setup; boolean casts emit booleans; model `decimal:2` casts emit **strings** for money. Dates below are ISO timestamp strings or null via `toISOString()`. Names/descriptions/contact fields are strings, with nullable fields noted. Null-safe relationship members may be null. Verify these types against PostgreSQL HTTP responses before finalizing frontend integration.

| Resource | Exact fields exposed by resource source |
| --- | --- |
| Category | `id`, `name`, `description` (nullable), `is_active`, `created_at`, `updated_at` |
| Product | `id`, `sku`, `name`, `description` (nullable), `cost_price` (decimal string), `selling_price` (decimal string), `reorder_level`, `is_active`, `category:{id,name}`, `inventory:{quantity}`, `created_at`, `updated_at` |
| Customer | `id`, `customer_code`, `name`, `phone`, `email` (nullable), `address` (nullable), `is_active`, `created_at`, `updated_at` |
| Supplier | `id`, `supplier_code`, `name`, `contact_person` (nullable), `phone`, `email` (nullable), `address` (nullable), `is_active`, `created_at`, `updated_at` |
| Inventory | `id`, `product_id`, `quantity`, `product:{id,sku,name}`, `updated_at` |
| Inventory transaction | `id`, `product_id`, `type`, `quantity` (signed), `reference_type` (nullable), `reference_id` (nullable), `notes` (nullable), `created_by` (nullable), `created_at` |
| Sales order | `id`, `order_number`, `status` (order enum string), `customer:{id,customer_code,name}`, `items:[{id,product_id,sku,product_name,quantity,unit_price,subtotal}]`, `total_amount`, `notes` (nullable), `order_date`, `created_at`, `updated_at` |
| Fulfillment | `id`, `sales_order_id`, `status`, `started_at`, `completed_at`, `packed_by` (nullable), `notes` (nullable) |
| Delivery | `id`, `sales_order_id`, `status`, `assigned_to` (nullable in model storage), `assigned_at`, `out_for_delivery_at`, `delivered_at`, `notes` (nullable) |

Order item `unit_price` and `subtotal`, and order `total_amount`, are decimal strings. Order item SKU/name and relationship members use null-safe access. Product inventory quantity falls back to zero when the relationship is missing. Product output has nested `category.id`, not a top-level `category_id`.

Stock-out transactions return negative quantities; stock-in transactions return positive quantities. Manual stock controller actions omit `createdBy`, so their transactions currently have a null creator; order confirmation supplies the acting user.

Order responses do **not** include fulfillment, delivery, status history, creator, available actions, or full customer contact information. Fulfillment/delivery mutations return their own resource rather than the updated order; a future query client must invalidate/refetch the order too.

## Pagination, filtering and sorting

Categories, products, customers, suppliers and inventory transactions use fixed pages of **15**, newest ID first. `page` selects the page. Their controllers implement no search, sorting, active filter, or configurable page size.

Orders also use newest ID first and accept:

| Query parameter | Validation/behavior |
| --- | --- |
| `status` | Optional nullable exact order enum string |
| `customer_id` | Optional nullable integer, existing customer |
| `search` | Optional nullable string max 100; case-insensitive `ilike` match against order number or customer name |
| `per_page` | Optional nullable integer 1–100; default 15 |
| `page` | Standard paginator page resolution; not explicitly validated in `ListSalesOrderRequest` |

Paginated response shape, derived from installed framework code:

```text
{
  data: Resource[],
  links: { first: string|null, last: string|null, prev: string|null, next: string|null },
  meta: {
    current_page: number,
    from: number|null,
    last_page: number,
    links: Array<{url: string|null, label: string, active: boolean, page?: number|null}>,
    path: string,
    per_page: number,
    to: number|null,
    total: number
  }
}
```

The controllers do not append filters using `withQueryString()`. Keep the active filters in query state and include them with each page request rather than assuming returned links preserve them. No aggregate low-stock endpoint exists. Product rows expose stock/reorder data for the loaded page; do not describe page-level counts as global analytics.

## Errors

| HTTP status | Actual handling and frontend consequence |
| --- | --- |
| 401 | Framework JSON `{message}`; clear invalid auth state and require login |
| 403 | Policy denial, framework JSON; show permission failure; debug mode can add exception details |
| 404 | Missing bound model uses framework JSON; missing delivery explicitly returns `{message:"Delivery has not been created for this order."}` |
| 409 | Known workflow/stock conflicts: `{success:false,message}` through the `BusinessConflictException` renderer; category deletion with products retains the same existing envelope |
| 422 | Laravel validation: `{message,errors:{field:[messages]}}`; invalid credentials also use this status |
| 429 | No explicit application API/login throttle is configured in the inspected routes/bootstrap; retain future client handling without claiming a verified rate-limit contract |
| 500 | Unhandled exceptions use framework rendering; with debug false, ordinary exceptions return `{message:"Server Error"}` |
| Network error | No HTTP response/envelope; frontend must distinguish it from an API response |

Invalid submit/confirm, order status transitions, fulfillment and delivery operations now throw `BusinessConflictException`. `InsufficientStockException` extends it. The renderer in `bootstrap/app.php` returns HTTP **409** for API paths or requests expecting JSON, with only `success:false` and a safe business message, even when debug is enabled. For example:

```json
{
  "success": false,
  "message": "Only draft orders can be submitted."
}
```

Only deliberate business exceptions receive this treatment. Generic `RuntimeException` and `InvalidArgumentException` are not globally converted. Missing inventory during order confirmation represents an internal data-integrity failure, so it returns **500** with a generic message when debug is false; the old broad controller catch has been removed. Inventory service guards for invalid type/quantity retain their programming-error exceptions, while request validation rejects those inputs as **422** before reaching the service. Missing route-bound resources remain **404**. Attempting to start an unassigned delivery is a **409** workflow conflict; reading a nonexistent delivery remains **404**.

Order confirmation with insufficient stock still returns **200** with `status:PENDING_STOCK`; that existing business outcome and its retry behavior were not changed in 02.2. Transactions, row locks and allowed transitions are unchanged.

Validation keys for order items use dotted paths such as `items.0.quantity`. Preserve them when mapping backend messages to form fields. Never render debug traces or treat every server-provided 500 message as suitable user-facing text.

## Authorization behavior

Roles: `ADMIN`, `SALES`, `WAREHOUSE`, `DELIVERY`.

| Capability | Allowed roles in current policies |
| --- | --- |
| Read categories/products/customers/suppliers/inventory/transactions/order details/delivery | All authenticated users |
| List orders | All authenticated users; request authorizes true, controller has no Gate check or ownership scope |
| Create/update/delete categories | ADMIN |
| Create/update products or suppliers | ADMIN, WAREHOUSE |
| Delete products, suppliers or customers | ADMIN |
| Create/update customers | ADMIN, SALES |
| Stock in/out | ADMIN, WAREHOUSE |
| Create/submit orders | ADMIN, SALES |
| Confirm orders; start/complete fulfillment | ADMIN, WAREHOUSE |
| Assign delivery | ADMIN, SALES |
| Start/complete delivery | ADMIN, DELIVERY |

These are role checks, not ownership checks. Delivery start/complete do not compare `assigned_to` with the acting user. A DELIVERY user is currently permitted to act on another user's delivery if its state permits the transition. Read policies also do not limit delivery users to assigned orders. Frontend hiding cannot fix this backend gap.

## Statuses and reachable workflow

```text
Order:
DRAFT, SUBMITTED, PENDING_STOCK, CONFIRMED, PACKING,
READY_FOR_DELIVERY, ASSIGNED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED

Fulfillment:
PENDING, IN_PROGRESS, COMPLETED

Delivery:
PENDING, ASSIGNED, OUT_FOR_DELIVERY, DELIVERED
```

| API action | Required state | Result |
| --- | --- | --- |
| Create order | Valid customer/items | DRAFT; prices snapshotted; no stock deduction |
| Submit | DRAFT | SUBMITTED |
| Confirm | SUBMITTED | CONFIRMED if all stock is available, with atomic stock deduction and SALE transactions; otherwise PENDING_STOCK, no deduction |
| Start fulfillment | CONFIRMED and no fulfillment record | Order PACKING; new fulfillment IN_PROGRESS |
| Complete fulfillment | Order PACKING and fulfillment IN_PROGRESS | Order READY_FOR_DELIVERY; fulfillment COMPLETED |
| Assign delivery | READY_FOR_DELIVERY and no delivery record | Order and delivery ASSIGNED |
| Start delivery | Both order and delivery ASSIGNED | Both OUT_FOR_DELIVERY |
| Complete delivery | Both order and delivery OUT_FOR_DELIVERY | Both DELIVERED |

`PENDING_STOCK` is a branch, not a mandatory step. The confirmation endpoint rejects PENDING_STOCK, even after replenishment, because `SalesOrderService::confirm()` only accepts SUBMITTED. `SalesOrderStatusService` separately allows PENDING_STOCK -> CONFIRMED, but the API confirmation path does not use that transition service.

The status service allows cancellation from DRAFT, SUBMITTED, PENDING_STOCK and CONFIRMED, but no cancellation API exists. Do not display an executable cancel action. The current fulfillment/delivery APIs create records directly in IN_PROGRESS/ASSIGNED; their PENDING enum values do not imply a pending record exists.

Status history is incomplete: submit, confirm and fulfillment directly update order status; delivery uses the history-recording transition service. No history resource/read endpoint exposes stored rows. Do not fabricate a historical timeline from current status alone.

## Gaps to address in separate approved steps

These are findings and recommendations, not implemented changes.

| Problem | Frontend/product impact | Smallest recommended direction |
| --- | --- | --- |
| PENDING_STOCK confirmation cannot retry | Replenished orders remain blocked | Align confirmation with the intended retry transition while preserving atomic stock checks and deductions |
| Delivery ownership and assignee role unchecked | Assignment-only delivery UX has no matching backend boundary | Validate DELIVERY assignees, enforce ownership for drivers with ADMIN override, and scope reads if required |
| No driver lookup | Cannot populate an authorized assignee selector | Add a minimal authorized delivery-user lookup returning only necessary fields |
| No fulfillment/history reads; incomplete history writes | Order details cannot restore full workflow information on reload | Expose authorized detail relationships/read endpoints; route relevant status changes through history recording |
| No dashboard aggregation; most lists lack search | Global stock analytics and scalable selectors are unsupported | Add targeted aggregation/search when the relevant module is designed |
| Cancellation only exists at service-transition level | No cancellable order operation for the UI | Design a dedicated operation with authorization and any required stock reversal before exposing it |
| Duplicate route declarations | Unnecessary maintenance ambiguity | Remove redundant order declarations in a separate small cleanup |

Additional observed hardening concerns for later review: order monetary calculations use PHP floats despite decimal storage; business-number generators use `max(id)+1` and can race; inventory read endpoints can create missing rows; manual stock adjustments omit creator attribution. None were changed during discovery.

## Mentoring note and checkpoint handoff

**What/why:** this document records the existing API so frontend types, forms, query keys and capabilities are based on evidence. **How/where:** routes define entry points, requests validate input, policies authorize, services enforce workflows, and resources define output; this reference lives at the repository root. **When:** consult it before implementing each frontend module and update it after an approved contract change. **Best practice/interview value:** distinguishing a model/service capability from a callable, tested API demonstrates integration engineering and prevents unsupported UX promises.

Run in PowerShell from the workspace root:

```powershell
Set-Location -LiteralPath '.\backend'
php artisan route:list --path=api --no-interaction
php artisan test --compact
```

Expected: 39 registered API routes and a passing complete test suite (133 tests / 346 assertions after 02.2). The existing `phpunit.xml` selects SQLite `:memory:`; focused and full-suite results are verified above. Do not pass `--no-interaction` after the Artisan `test` command because the test runner receives it.

Send the test summary (or error output). Sub-checkpoint 02.2 is complete; stop until the user explicitly types `continue` before starting 02.3 (PENDING_STOCK retry). The remaining gaps above are unchanged; Checkpoint 02 as a whole is not yet complete.
