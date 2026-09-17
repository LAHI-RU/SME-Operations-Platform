# SME Operations frontend

React + TypeScript application for the Laravel API in `../backend`. All business
workspaces now have working screens backed by the existing API. The backend
contract and its remaining gaps are documented in `../BACKEND_API_CONTRACT.md`.

## What is implemented

| Workspace | Functionality |
| --- | --- |
| Authentication | Login, session restoration, logout, safe return URLs, expiry handling, and protected routes. |
| Dashboard | Six real order summaries, recent orders, refresh, partial failures, and role-aware shortcuts. |
| Categories | Paginated list, details, create, edit, active state, and confirmed deletion. |
| Products | Paginated catalog, details, prices, categories across pages, create/edit, active state, and confirmed deletion. |
| Inventory | Product stock, reorder indicators, stock in/out with review, references, and paginated movement history. |
| Customers / suppliers | Paginated directories, details, contact forms, editing, active state, and confirmed deletion. |
| Orders | Search/status/customer filters, pagination, customer/product selection, dynamic line items, exact decimal estimates, draft creation, submission, and stock confirmation. |
| Fulfillment | Status-filtered picking/packing queues, start/complete actions, and completion notes. |
| Delivery | Dispatch queues, account-ID assignment, start/complete actions, notes, and recorded delivery timestamps. |
| Order workspace | Saved line items/totals, customer links, current workflow stage, next permitted action, and delivery tracking. |

The shared UI includes a desktop sidebar, mobile navigation, consistent tables
and forms, confirmation dialogs, success notifications, error/loading/empty
states, keyboard focus handling, and a recoverable application error boundary.
Order form/detail and design-system code are loaded on demand.

## Run locally

Prerequisites: Node.js 22.12+ or 24+, npm, and the running Laravel backend.
Verification used Node 24.11, PHP 8.3, and PostgreSQL 18.

From the workspace root, in one PowerShell terminal:

```powershell
Set-Location -LiteralPath '.\backend'
php artisan serve --host=127.0.0.1 --port=8000 --no-interaction
```

In a second terminal:

```powershell
Set-Location -LiteralPath '.\frontend'
npm ci
if (-not (Test-Path -LiteralPath '.env.local')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
}
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open http://127.0.0.1:5173 and sign in with an existing development account.
Browser-test accounts exist only in the disposable test database; they are not
automatically added to your development database.

Stop a running frontend server before `npm ci`: Windows can lock the native Vite
library. Scripts invoke tools through Node directly because `.cmd` wrappers can
misinterpret the `&` in this workspace's path.

The default example API URL is `http://127.0.0.1:8000/api/v1`. Restart Vite after
changing `.env.local`. Without a configured URL the client uses `/api/v1`, which
requires a same-origin API reverse proxy; the development server has no API proxy.
`VITE_*` values are public build configuration. Never put credentials in them.

## Verification

From `frontend`:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
```

- `npm test`: 106 API-client, auth, permission, navigation, dashboard, product,
  operation-contract, decimal-estimate, and workflow tests. UI tests here use
  jsdom and mocked HTTP; they do not claim browser layout coverage.
- `npm run test:browser`: Playwright runs Chrome locally, starts an isolated
  PostgreSQL 18 Docker container, migrates/seeds a temporary database, starts
  Laravel on 8011 and Vite on 5177, and exercises actual HTTP integration.
- Browser checks cover create/edit/delete, stock conflicts and adjustments,
  order creation through delivery, search, reload, all four real account roles,
  field validation, desktop/mobile layout, keyboard behavior, and axe scans.
  One additional 422 response is deliberately mocked to exercise dotted
  order-item validation messages.
- Browser tests require Docker, PHP with `pdo_pgsql`, installed backend Composer
  dependencies, and Chrome. CI installs Playwright Chromium instead.
- Use the complete browser suite: the initial workflow creates the records that
  subsequent permission, layout, and accessibility checks inspect. Ports 8011 and
  5177 must be free. The runner refuses to reuse another server on those ports.
- Owned test containers are removed after the suite. Screenshots/traces and test
  startup files live in ignored `test-results/` and `.e2e/` directories.
- Automated accessibility scans target WCAG A/AA rules. They do not establish
  complete accessibility compliance; manual keyboard and assistive-technology
  review remain valuable. See [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing).

The existing complete Laravel suite was also verified: 133 tests / 346 assertions.
Run it from `backend` with `php artisan test --compact`.

## API and state decisions

The existing bearer-token API remains unchanged. The fetch client sends JSON,
omits cookies, rejects redirects, enforces a 15-second request/body timeout, and
normalizes errors without displaying server debug traces. Writes are never
retried automatically. If a connection fails during a write, check the record
before repeating the action.

The token is held in memory and sessionStorage scoped to the API base URL.
Restoration validates `/auth/me` before rendering protected content. Tokens and
passwords never enter query keys; passwords are not persisted. sessionStorage
survives refresh in the current tab and remains JavaScript-accessible. An HttpOnly
session requires a separate backend authentication/CSRF design.

TanStack Query uses 30-second freshness, no automatic retry, no window-focus
refetch, and cancellation signals on reads. Session changes clear query data.
Duplicate writes are blocked, and responses from an earlier session cannot
navigate or populate the new session. Successful writes refresh related views.
See [TanStack Query defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults).

Zod validates resource shapes at API boundaries. React Hook Form manages catalog,
contact, inventory, and order forms. Laravel 422 messages map to their fields,
including `items.0.quantity`. Submitted order bodies contain only the customer,
product IDs, quantities, and notes. Stored prices/totals come from Laravel;
frontend estimates use integer minor units rather than floating-point addition.
No currency symbol is invented because the API does not supply a currency.

## Role behavior

| Role | Visible write actions |
| --- | --- |
| ADMIN | All operations registered by the backend. |
| SALES | Create/update customers; create/submit orders; assign delivery. |
| WAREHOUSE | Create/update products/suppliers; stock in/out; confirm orders; start/complete fulfillment. |
| DELIVERY | Start/complete delivery. |

All four roles currently have backend read access to catalog/contact/inventory
records and orders. The fulfillment queue itself is for ADMIN/WAREHOUSE.
Capabilities are centralized in `src/features/auth/permissions.ts`; Laravel
policies remain the actual authorization boundary.

## Deliberate backend limitations

These are existing API constraints, not simulated frontend features:

- `PENDING_STOCK` cannot be reconfirmed by the current endpoint, even after stock
  is replenished. The order screen explains the blockage and links to Inventory.
- There is no driver lookup endpoint. Assignment therefore accepts an existing
  user ID supplied by an administrator. The backend does not currently validate
  the DELIVERY role or enforce driver ownership; delivery queues are not claimed
  to be restricted to the current driver's assignments.
- Fulfillment/history reads are absent and status-history writes are incomplete.
  The workflow strip shows current progress, not an invented historical audit.
  Delivery timestamps are displayed only when supplied by the delivery resource.
- No cancellation, order edit, or order delete endpoint exists. Those controls
  are not presented.
- Categories/products/customers/suppliers use fixed 15-record pages without
  server search. Selectors load additional pages on request. Only order search
  and documented order filters are implemented.
- No global low-stock aggregation exists. Inventory indicators apply to actual
  displayed products; dashboard stock totals are explicitly unavailable.
- Related records can prevent deletion. Categories return a deliberate conflict;
  some other foreign-key conflicts can return a generic backend error.
- Referenced categories/customers/products are not required to be active by the
  current backend. Inactive options are labelled instead of silently excluded.

No backend endpoints, policies, schema, or development business records were
changed during this frontend implementation.

## Production build and container

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

`dist/` contains the static build. Preview is a local check, not a production server.
For a production build, provide the public HTTPS API URL before building and
configure the backend's allowed origins for the frontend origin.

From `frontend`, build and run the Nginx container (replace the example API URL):

```powershell
docker build --build-arg VITE_API_BASE_URL=https://api.your-domain.example/api/v1 -t sme-frontend:local .
docker run --rm -p 8080:8080 sme-frontend:local
```

Nginx serves deep links through `index.html`, revalidates HTML, caches hashed
assets, provides `/healthz`, and returns 404 for missing assets or misplaced
`/api/` requests. This container expects an external API URL. Terminate HTTPS at
your production ingress/load balancer. Changing the API URL requires rebuilding.
The container does not include local `.env` files or backend credentials.

`.github/workflows/frontend.yml` runs static checks, unit tests, production build,
and isolated browser integration checks. It does not deploy. The workflow has
not been run on GitHub until you commit/push it; local equivalent checks are
reported separately. AWS resources, domains, certificates, and deployment remain
a separate task.

## Source map

- `src/components/layout/`: responsive shell and navigation.
- `src/components/ui/`: shared controls, table/page states, dialogs, toasts, and error boundary.
- `src/features/auth/`: session state, route guards, login, and capability matrix.
- `src/features/dashboard/`: supported aggregate queries and recent orders.
- `src/features/products/`: product catalog API and screens.
- `src/features/directory/`: shared category/customer/supplier CRUD driven by explicit field definitions.
- `src/features/inventory/`: stock views, adjustments, and transaction ledger.
- `src/features/orders/`: queues, draft form, detail workspace, and supported workflow actions.
- `src/features/operations/`: validated API adapters and shared mutation/session handling.
- `tests/browser/`: real Laravel/PostgreSQL browser workflow and UI verification.

Commits remain manual. Suggested message:

```text
feat: complete operations frontend with polished UI and end-to-end tests
```