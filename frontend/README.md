# SME Operations frontend

Separate React + TypeScript + Vite application for the Laravel API in `../backend`.

## Current step

Step 8 (Checkpoint 09) adds product listing, details, creation, editing, and
administrator deletion against the existing Laravel API. React Hook Form handles
catalog forms; Zod validates catalog responses; TanStack Query manages reads and
cache refresh. Other business modules remain previews. No backend endpoints,
policies, users, or schema were changed.

## Run locally

Use Node.js 22.12+ or 24+ (verified with Node.js 24.11.0) and npm.
From the workspace root in PowerShell:

```powershell
Set-Location -LiteralPath '.\frontend'
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Stop any running frontend server before `npm ci`: Windows locks Vite's native
build library while the server is running, which prevents a clean reinstall.

Open http://127.0.0.1:5173. Without a valid session, expect the login page.
Configure the API URL below and run Laravel before signing in with an existing account.
Use Ctrl+C to stop the server. Edit `src/App.tsx` to see Vite update the page.

## Quality checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Preview serves the production build at http://127.0.0.1:4173. It is a local check,
not a production hosting server. Build output is in `dist/` and is ignored by Git.
`npm test` runs the Node test runner with jsdom and Vite's TypeScript transform.
The 28 navigation/login/dashboard integration tests cover the root redirect, module routes, active links,
document titles, focus/scroll behavior, mobile menu dismissal, history navigation,
path variants, component-preview validation, and 404 recovery. These DOM simulations
do not verify visual appearance, CSS breakpoints, or real browser layout.
They also exercise login validation, password visibility, duplicate-submit blocking,
return links, logout, and logout failure feedback with mocked HTTP responses.
Role checks cover both navigation surfaces, dashboard shortcuts, direct URL denial,
action labels for all four roles, and capability changes in the active auth state.
Dashboard cases cover real totals, partial failures, stale-result labels, permission
failures, empty results, session cache isolation, loading, and request cancellation.
The 26 API-client tests cover URL configuration, request serialization, token
selection, response envelopes, HTTP errors, cancellation, timeout, and real fetch
transport against a temporary local test server. They do not use business data.
The 15 auth-store tests cover session restoration, token persistence, response
validation, all four roles, expiry, failed requests, and stale-response races.
Six capability tests verify the 31-capability policy matrix, unknown role/capability
denial, and navigation filtering. Five dashboard API tests verify pagination totals,
exact status filters, nullable fields, malformed data rejection, and empty results.
Five product API tests and 11 product DOM tests cover payloads, response validation,
pagination, category paging, forms, role restrictions, deletion confirmation,
server errors, duplicate submissions, and late writes after sign-out.
Total: 96 frontend tests. The dashboard was also checked against the running local
Laravel/PostgreSQL API; the temporary verification token was revoked afterward.
Test Vite servers disable WebSockets/file watching and
use separate caches to avoid colliding with one another or the development server.

The scripts invoke each installed tool through Node directly. This avoids npm's
Windows `.cmd` wrappers, whose unquoted path assignment fails on the `&` in this
workspace name. These relative Node commands also work on Linux and in Docker.

## Files to know

- `index.html`: browser document, metadata, and React mounting element.
- `src/main.tsx`: mounts React with StrictMode and BrowserRouter, and imports global styles.
- `src/App.tsx`: declares routes nested inside the shared layout.
- `src/components/layout/AppLayout.tsx`: sidebar/content structure, skip link, route focus and title updates.
- `src/components/layout/Sidebar.tsx`: shared navigation links and brand.
- `src/components/layout/Topbar.tsx`: authenticated account, sign-out, page context, and mobile navigation.
- `src/lib/navigation.ts`: one navigation list for desktop/mobile links and module placeholders.
- `src/pages/WorkspacePages.tsx`: dashboard preview, module preview, and recoverable 404.
- `src/index.css`: Tailwind import, shared theme variables, and base styles.
- `src/components/ui/`: `Button`, `Input`, `Card`, and `Badge` primitives.
- `src/components/status/StatusBadge.tsx`: order status presentation.
- `src/lib/order-status.ts`: one label and tone per order status.
- `src/types/order.ts`: exact status names from the backend enum, without transition rules.
- `src/pages/DesignSystemPreview.tsx`: local examples for visual and keyboard review.
- `tsconfig.app.json`: strict checks for application code.
- `tsconfig.node.json`: strict checks for Vite configuration.
- `.oxlintrc.json`: lint configuration including React hook rules.
- `vite.config.ts`: React and Tailwind integration with Vite.
- `package-lock.json`: locked dependency versions; use `npm ci` on a fresh checkout.
- `tests/navigation.test.mjs`: route and navigation interaction tests.
- `.env.example`: public API URL example; copy to ignored `.env.local` for development.
- `src/vite-env.d.ts`: types the optional Vite API URL variable.
- `src/lib/api/config.ts`: validates and normalizes the API base URL.
- `src/lib/api/client.ts`: reusable request transport and cancellation handling.
- `src/lib/api/error.ts`: stable error categories, display messages, and field errors.
- `src/lib/api/index.ts`: shared auth store and its authenticated API client.
- `src/types/api.ts`: resource, message, and pagination envelope types.
- `tests/api-client.test.mjs`: client contract and transport tests.
- `src/features/auth/auth-api.ts`: login/me/logout calls and runtime account-response validation.
- `src/features/auth/auth-store.ts`: session state, persistence, restoration, and stale-request protection.
- `src/features/auth/use-auth.ts`: React subscription to the shared auth store.
- `src/features/auth/AuthGate.tsx`: loading/error boundaries, route protection, and internal return links.
- `src/features/auth/LoginPage.tsx`: accessible two-field login form and validation feedback.
- `tests/auth-store.test.mjs`: authentication lifecycle and concurrency tests.
- `src/features/auth/permissions.ts`: the centralized `can(user, capability)` policy map.
- `src/features/auth/Can.tsx`: hides UI children when the current session lacks a capability.
- `src/features/auth/CapabilityGate.tsx`: a recoverable Access denied page for protected module routes.
- `tests/permissions.test.mjs`: expected capabilities derived from the Laravel policies.
- `src/lib/query-client.ts`: TanStack Query defaults shared by authenticated screens.
- `src/features/dashboard/dashboard-api.ts`: six supported order-summary requests and response decoding.
- `src/features/dashboard/DashboardPage.tsx`: live metrics, recent orders, refresh, and partial-error states.
- `tests/dashboard-api.test.mjs`: dashboard response and filter contract tests.

Consult `../BACKEND_API_CONTRACT.md` before implementing API clients. Role responses
and conflict handling are available; pending-stock retry, delivery lookup/ownership,
and workflow reads still have documented gaps.

## Design conventions

Use shared semantic utilities such as `bg-brand`, `text-muted`, and `border-line`
rather than choosing new colors on each page. Theme values live in one CSS `@theme`
block. Tailwind's Vite plugin generates utilities; no legacy Tailwind config or
separate PostCSS setup is needed.

- Primary actions: teal. Destructive actions: red. Buttons default to `type="button"`;
  specify `type="submit"` for form submission. `loading` also disables interaction.
- Inputs require a visible label and associate hints/errors through `aria-describedby`.
  They accept native input props and refs used by the React Hook Form product forms.
- Status colors: delivered = success; pending stock = warning; cancelled = danger;
  active workflow states = info; draft = neutral. Labels communicate status without color.
- Cards use semantic sections; provide a heading and `aria-labelledby` when grouping content.
- Focus outlines, 44px minimum button/input heights, and reduced-motion spinner support
  are built in. These are accessibility provisions, not a completed accessibility audit.
- System fonts avoid external font requests. The preview stacks columns on narrow screens.

## Manual preview checks

1. At desktop width (1024px+), check the sidebar and active page link. Try each permitted module.
2. At 375px width, open Menu with Enter/Space. Tab to a link, then press Escape:
   the menu should close and focus return to Menu. Select a link: the menu closes
   and focus moves to page content. This is an inline disclosure, not a modal drawer.
3. Use Back/Forward, reload `/inventory`, and visit an unknown path. Expect the
   correct page or a 404 with a working link back to the dashboard.
4. Tab from the address bar and use Skip to content; confirm visible focus.
5. Confirm the account area shows the actual signed-in name and role. Sign out
   and verify the login page replaces the workspace, including when pressing Back.
6. Visit `/design-system`. Check button feedback, disabled/loading controls, empty
   Display name validation with input focus, and valid submission feedback.
7. At mobile width and 200% browser zoom, check wrapping and no horizontal scrolling.
   Check every order status badge has a readable label.
8. On a business module preview, check the Your role in this area section. It lists
   permissions as labels, not working action buttons. Compare with the matrix below.

Browser interaction and visual verification require the manual checks above when no
browser is connected to Codex.

## Routing decisions

The app uses React Router's declarative `BrowserRouter`, nested `Routes`, and
`Outlet`: the layout stays mounted while its page content changes. `NavLink`
provides active-link semantics. See the [official routing guide](https://reactrouter.com/start/declarative/routing).

Routes: `/dashboard`, `/orders`, `/fulfillment`, `/delivery`, `/products`,
`/categories`, `/inventory`, `/customers`, `/suppliers`, and `/design-system`.
`/` redirects to `/dashboard`; unknown paths show the 404 page. The design-system
route is intentionally available behind authentication in this checkpoint's preview
build; revisit its visibility before production. `/login` is public. All workspace
routes are protected, including the component catalog and the 404 page. Signed-in
users visiting `/login` return to a safe internal destination or `/dashboard`.
Module entries, desktop/mobile navigation, and dashboard shortcuts share the same
capability metadata. A disallowed direct module URL renders Access denied inside
the layout with a route back to the dashboard. This frontend 403 page is not an
HTTP authorization boundary.

Vite handles deep links locally. At the hosting checkpoint, configure the frontend
server to fall back to `index.html` for application paths so refresh/direct links
work in production; keep API routing separate. No deployment is part of this step.

## API client configuration

From `frontend`, create a local configuration only if it does not already exist:

```powershell
if (-not (Test-Path -LiteralPath '.env.local')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
}
```

The example uses `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1` for Laravel's
local server. Include `/api/v1`; do not repeat it in endpoint paths. An absolute
HTTP(S) URL or root-relative path ending in `/api/v1` is accepted. With the variable
absent, the client uses `/api/v1` on the frontend's origin; this needs a same-origin
API server/reverse proxy. The Vite development server does not proxy API requests.
Use the absolute local URL while developing with separate frontend/backend ports.

`VITE_*` values are public and embedded at build time. They must never contain
tokens, passwords, or private keys. Restart Vite after changing the local file;
set the correct public URL before production builds. See [Vite's environment guide](https://vite.dev/guide/env-and-mode).

Start Laravel in a separate terminal from the workspace root when integrating:

```powershell
Set-Location -LiteralPath '.\backend'
php artisan serve --host=127.0.0.1 --port=8000 --no-interaction
```

Authentication uses this client now. A future endpoint module can use it as follows
(this health example is not an automatic request on page load):

```typescript
import { api } from '../lib/api'
import type { MessageResponse } from '../types/api'

type HealthData = { application: string; environment: string }
const result = await api.request<MessageResponse<HealthData>>('/health', {
  auth: false,
})
// result.success, result.message, and result.data are all preserved.
```

All requests send `Accept: application/json`; requests with a body serialize JSON
and add `Content-Type: application/json`. Pass query values using `query`, not in
the endpoint string. Null/undefined values are omitted; `0` and `false` are kept.
Keep filters in each page request because Laravel's returned pagination links do
not preserve them. Use `ResourceResponse<T>`, `MessageResponse<T>`, or
`PaginatedResponse<T>` for the actual endpoint contract. The generic return type
does not perform runtime domain-schema validation; add schemas with each feature.
For a 204 response, use `request<void>`; existing delete endpoints instead return
a JSON message envelope with `data: null`.

The auth store configures `createApiClient({ baseUrl, getAccessToken, onUnauthorized })`.
The token reader runs for each request. Public requests use `auth: false`. The
transport delegates a protected 401 to the auth store with the request's token;
only a matching current token is cleared. Old requests cannot erase a newer login.
The auth store owns persistence and route guards own redirects. Cookie credentials
are omitted because the existing backend uses Sanctum bearer tokens.

The transport has a 15-second timeout (including response-body reading), accepts
an `AbortSignal`, and never retries requests automatically. A timed-out or interrupted
write may already have succeeded on the server; check the record before repeating it.
Redirects are rejected so requests remain directed at the configured API endpoint.

Catch `ApiError` and use `kind`, `status`, `message`, and `fieldErrors`:

| Kind | Handling when building each screen |
| --- | --- |
| `validation` (422) | Map field errors to the form, preserving keys such as `items.0.quantity`. |
| `conflict` (409) | Show the deliberate business message and refresh the affected record as appropriate. |
| `unauthenticated` (401) | The shared store clears the matching current session; route guards require login. |
| `forbidden` / `not_found` | Show permission or missing-record feedback. |
| `rate_limited` / `server` / `http` | Show the normalized message; do not automatically repeat writes. |
| `network` / `timeout` | Explain the connection issue; verify writes before retrying. |
| `cancelled` | Usually suppress alerts for deliberate navigation/query cancellation. |
| `invalid_response` | Successful HTTP response was not valid JSON; check API URL/server configuration. |
| `configuration` | Fix the client URL, endpoint, body, or timeout configuration. |

Raw exception traces and request credentials are not retained in errors. Only the
known safe 409 envelope and 422 field messages preserve backend display text;
render these as text. Success remains based on HTTP status: an order returned with
`PENDING_STOCK` at HTTP 200 is a business outcome, not an HTTP error. No workflow
transition rules are duplicated in the client.

## Authentication behavior and review

Persistence uses sessionStorage, selected for the existing bearer-token backend.
Only the token is stored, under a key scoped to the API base URL; passwords and
user profiles are never persisted. `/auth/me` supplies fresh account data after
reload, and all auth responses validate the account shape and the exact backend
roles before accepting a session. The two-field login form uses native inputs
and local React state; product forms use React Hook Form.

sessionStorage survives reloads and normally ends with the tab's browsing session.
It remains accessible to JavaScript and is not an HttpOnly cookie. A newly opened
tab may inherit a copy from its opener; it is not a cross-tab logout mechanism.
See [MDN's sessionStorage reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).
An HttpOnly session would require a deliberate backend/session/CSRF/CORS change.
There is no refresh-token endpoint or configured bearer expiry in the current
backend contract. Closing a tab removes browser persistence, not the server token.

- Restoring: keep workspace content hidden until `/auth/me` succeeds.
- Expired/invalid token: clear the current session and require login.
- Network/server failure during restoration: preserve the token and show Retry;
  local sign-out is available, clearly stating that the server token was not revoked.
- Normal sign-out: call `/auth/logout` before clearing local state. A failure keeps
  the session and displays an error so the user can retry. A 401 clears it.
- Storage blocked: continue in memory and show a notice that refresh persistence
  is unavailable. No localStorage fallback is used.
- Return URLs: retain only safe internal paths; no external post-login redirect.
- Duplicate login/logout attempts share the pending request. Late restoration or
  old-token 401 responses cannot overwrite the newer session.

Manual review with an existing backend account (test-suite users are temporary,
not accounts to use in the application):

1. Run Laravel on port 8000 and Vite on port 5173; restart Vite after setting `.env.local`.
2. Open `/inventory` while signed out: expect login, with no workspace flash.
3. Submit empty fields or invalid credentials: expect visible errors and focus on
   the first invalid field. Check password visibility and disabled submit while pending.
4. Sign in: expect return to `/inventory` and your actual name/role in the top bar.
5. Refresh: expect a brief session check, then the same protected page.
6. Stop Laravel and refresh: expect verification failure with Retry, not a fake
   signed-in state. Restart Laravel and Retry: expect the session to restore.
7. Sign out: expect `/login`; Back must not reveal protected content. Sign in again
   to verify that login remains usable after logout.
8. Review login at mobile width and 200% zoom, keyboard focus, and password-manager
   autofill. Real browser interaction and CORS still need this manual check.

## Role capabilities

The source of truth for this checkpoint is `backend/app/Policies/` and the
`Gate::authorize` calls in the API controllers. All four authenticated roles can
currently read categories, products, customers, suppliers, inventory/transactions,
orders, and delivery details. These read links remain visible for every role.
Dashboard and design-system access are local UI capabilities for authenticated roles.

| Role | Permitted write operations in the existing policies |
| --- | --- |
| ADMIN | All registered create/update/delete, stock, order, fulfillment, and delivery operations. |
| SALES | Create/update customers; create/submit orders; assign delivery. |
| WAREHOUSE | Create/update products and suppliers; stock in/out; confirm orders; start/complete fulfillment. |
| DELIVERY | Start/complete delivery. |

The standalone fulfillment workspace is for picking/packing operations, so entry
uses `fulfillment.start` (ADMIN/WAREHOUSE). There is no fulfillment-read endpoint
to map a read-only fulfillment workspace to. SALES and DELIVERY cannot see its
navigation item or dashboard shortcut; opening `/fulfillment` directly shows
Access denied. Other permitted read pages stay accessible even when the role has
no write actions, and their previews explain that access is read-only.

Each module's `actions` metadata names its future operations. `Can` renders only
the permitted labels in the preview. As real forms and actions are implemented,
use the same capability keys instead of comparing roles in individual components:

```typescript
import { can } from './features/auth/permissions'

const mayConfirmOrders = can(user, 'orders.confirm')
```

For conditional React content, use `<Can capability="orders.confirm">...</Can>`.
`CapabilityGate` protects page content and shows Access denied for a disallowed
capability. Missing/unknown roles and unsupported capabilities fail closed. The
ADMIN role receives only listed capabilities, not a wildcard for unimplemented APIs.

These checks describe role permissions only. Future action availability must also
account for record state and Laravel responses. They do not authorize HTTP calls,
validate stock availability, or enforce ownership. There are no new operations for
order edit/cancellation, driver lookup, or fulfillment/history reads. In particular,
the current backend does not restrict delivery actions to the assigned driver;
that documented hardening gap still needs a backend change. Do not describe the
current DELIVERY interface as enforcing assignment-only access.

Review with existing role accounts if available; automated tests use mocked role
fixtures and do not create accounts or change roles in your development database:

1. ADMIN: all module links and relevant action labels are visible.
2. SALES: fulfillment is absent; orders show Create/Submit, delivery shows Assign,
   and products allow viewing without create/edit/delete controls.
3. WAREHOUSE: fulfillment is present; orders show Confirm, inventory shows Stock
   in/out, and delivery shows read-only guidance.
4. DELIVERY: fulfillment is absent; delivery shows Start/Complete, and orders show
   read-only guidance. Other existing read permissions remain visible.
5. As SALES/DELIVERY, visit `/fulfillment`: expect Access denied and a working
   Back to dashboard link. Confirm desktop/mobile navigation agree.
6. Refresh after a real backend role change so `/auth/me` loads the current role.
   Backend authorization remains effective even while a frontend session is stale.

## Dashboard data and verification

The current API has no `/dashboard` endpoint. Each dashboard load uses six existing
`GET /orders` requests with `page=1`. The unfiltered `per_page=5` response provides
both the total and recent records; five `per_page=1` status queries provide the
remaining counts. Counts come from `meta.total`, never the number of rows in a page.

| Dashboard card | Source |
| --- | --- |
| Total orders | Unfiltered orders `meta.total`, including every status. |
| Awaiting confirmation | `status=SUBMITTED` |
| Waiting for stock | `status=PENDING_STOCK` |
| Ready to pack | `status=CONFIRMED` |
| Ready for delivery | `status=READY_FOR_DELIVERY` |
| Out for delivery | `status=OUT_FOR_DELIVERY` |

Counts represent current status across all dates, not daily events or a complete
status breakdown. They are independent requests, not an atomic snapshot, and may
change between requests. No status counts are summed into a purported global total.
The current backend order list is not scoped by delivery ownership, so this is
an overview of accessible orders, not a personal assigned-delivery dashboard.

Recent orders follow the backend's descending ID order and show at most five
records: order number, nullable customer name, exact status badge, and creation
date. Dates use the browser's locale/timezone. Currency and revenue are omitted
because the API has no currency contract or aggregate revenue endpoint. Row links
and status-filter shortcuts are deferred until the order screens exist; the Orders
workspace link opens the existing preview.

Low-stock totals cannot be computed from a single products page. The stock section
explicitly states that totals are unavailable; it does not scan the full catalog
or fabricate a zero. Add a global low-stock aggregate when backend support is designed.

TanStack Query defaults are explicit: 30-second freshness, no automatic retries,
no refetch on window focus, and normal stale-query refetch on remount/reconnection.
There is no polling. Refresh dashboard refreshes its active queries together.
Each query passes its cancellation signal through the shared fetch client.
See [TanStack Query's defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults).

Query data stays in memory. The auth state has a non-secret session version;
successful login/restoration and session clearing change it. The API composition
subscribes to this change and synchronously clears the query cache, cancelling
pending queries before another session can use cached data. Tokens are never query
keys or persisted query data. A failed sign-out preserves the current session/cache.
Tests disable query garbage-collection timers and clear the cache during teardown
so Node does not wait for browser-oriented cleanup timers.

Failures never turn into fake zero counts. Initial failures display Unavailable;
refresh failures can show explicitly labeled last-known values while other cards
remain usable. A 401/403 suppresses cached results for the rejected query; a 401
also clears the matching session. Malformed totals, unknown statuses, and malformed
recent records produce controlled errors instead of silently populating the UI.

Manual dashboard review:

1. Sign in and open `/dashboard`: expect six order summary cards and up to five
   recent records from your database, or an explicit empty state.
2. Compare a count with the matching `/orders` API paginator total, not its row count.
3. Click Refresh dashboard: expect progress feedback followed by updated timestamps.
4. Stop the API and refresh: expect error feedback and clearly marked prior values.
   Restart the API and refresh again to recover.
5. Sign out and sign in again: previous session data must not flash on the dashboard.
6. At mobile width/200% zoom, confirm cards stack, long customer names wrap, and the
   recent-orders table scrolls within its own keyboard-focusable region.
7. Confirm the Stock overview section explicitly says low-stock totals are unavailable.

## Product catalog behavior and verification

Routes: `/products`, `/products/new`, `/products/:productId`, and
`/products/:productId/edit`. All four roles can read. ADMIN and WAREHOUSE can
create/update; only ADMIN sees deletion. Direct form URLs enforce the same
capabilities, and Laravel remains the authorization boundary.

- `src/features/products/products-api.ts`: exact request payloads and Zod resource validation.
- `src/features/products/ProductsPage.tsx`: real totals, URL page state, empty/error/retry states.
- `src/features/products/ProductDetailPage.tsx`: prices, stock, status, and explicit delete confirmation.
- `src/features/products/ProductFormPage.tsx`: create/edit, field feedback, focus, and category paging.
- `src/features/products/product-queries.ts`: query keys and cache invalidation after writes.

The backend fixes product pages at 15 records, newest ID first. There is no
product search/filter endpoint, so this screen does not pretend to search the
whole catalog locally. Out-of-range pages offer Previous to recover. Prices
retain decimal strings and display without an invented currency symbol.

A category must already exist. The selector can load subsequent category pages;
editing preserves the current category before its page is loaded. Inactive
categories remain selectable because the backend currently only requires that
the category exists. Category management is a later checkpoint.

Create sends catalog fields only; Laravel creates an active product with zero
inventory. Edit sends all required fields using PUT, plus the active checkbox.
Stock cannot be changed through this form. Values survive failed requests; 422
errors appear at their fields. Pending submissions disable controls and block
duplicate requests. Writes are never retried automatically. Success invalidates
related lists and updates the detail cache; session changes discard late results.

Deletion requires a separate confirmation with focus on Keep product. Successful
deletion returns to the first list page. Related records may prevent deletion;
the existing backend can return a generic 500 for foreign-key constraints, which
is shown as a safe error without claiming the product was deleted. Marking a
product inactive is available through Edit.

Automated product UI tests use mocked HTTP responses, including all writes.
The existing backend product suite also passes (10 tests, 25 assertions, isolated
in-memory SQLite). Live Laravel/PostgreSQL reads validated the empty product list
and three category records; there were no products for a live detail check. The
verification token was revoked, and no business records were changed. These
checks do not replace visual and real-browser testing.

Manual review using disposable development products:

1. Open Products; check actual rows, prices, stock, refresh, and Next/Previous.
2. As ADMIN/WAREHOUSE, create a product with an existing category. Expect details,
   a saved message, and zero initial stock. Try an existing SKU to see validation.
3. Edit the name/prices and active state. Expect saved details and an updated list.
4. As ADMIN, open Delete product, cancel, then confirm only for a disposable record.
5. As SALES/DELIVERY, confirm create/edit/delete controls are absent and direct
   form URLs show Access denied.
6. At 375px and 200% zoom, check form labels, error focus, wrapping, and table scrolling.

Commits are manual. Suggested message for this step:
`feat: add product catalog management`
