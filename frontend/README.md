# SME Operations frontend

Separate React + TypeScript + Vite application for the Laravel API in `../backend`.

## Current step

Step 3 (Checkpoint 04) adds the application layout: desktop sidebar, top bar,
responsive mobile navigation, shared page container, and React Router routes.
The dashboard and module screens are explicit previews with no invented business
records or metrics. The existing component catalog lives at `/design-system`.
API integration and authentication remain separate upcoming checkpoints.

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

Open http://127.0.0.1:5173. Expect a redirect to `/dashboard` with the shared layout.
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
The nine integration tests cover the root redirect, module routes, active links,
document titles, focus/scroll behavior, mobile menu dismissal, history navigation,
path variants, component-preview validation, and 404 recovery. These DOM simulations
do not verify visual appearance, CSS breakpoints, or real browser layout.

The scripts invoke each installed tool through Node directly. This avoids npm's
Windows `.cmd` wrappers, whose unquoted path assignment fails on the `&` in this
workspace name. These relative Node commands also work on Linux and in Docker.

## Files to know

- `index.html`: browser document, metadata, and React mounting element.
- `src/main.tsx`: mounts React with StrictMode and BrowserRouter, and imports global styles.
- `src/App.tsx`: declares routes nested inside the shared layout.
- `src/components/layout/AppLayout.tsx`: sidebar/content structure, skip link, route focus and title updates.
- `src/components/layout/Sidebar.tsx`: shared navigation links and brand.
- `src/components/layout/Topbar.tsx`: account placeholder, page context, and mobile navigation.
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
  They accept native input props, including refs for React Hook Form integration later.
- Status colors: delivered = success; pending stock = warning; cancelled = danger;
  active workflow states = info; draft = neutral. Labels communicate status without color.
- Cards use semantic sections; provide a heading and `aria-labelledby` when grouping content.
- Focus outlines, 44px minimum button/input heights, and reduced-motion spinner support
  are built in. These are accessibility provisions, not a completed accessibility audit.
- System fonts avoid external font requests. The preview stacks columns on narrow screens.

## Manual preview checks

1. At desktop width (1024px+), check the sidebar and active page link. Try every module.
2. At 375px width, open Menu with Enter/Space. Tab to a link, then press Escape:
   the menu should close and focus return to Menu. Select a link: the menu closes
   and focus moves to page content. This is an inline disclosure, not a modal drawer.
3. Use Back/Forward, reload `/inventory`, and visit an unknown path. Expect the
   correct page or a 404 with a working link back to the dashboard.
4. Tab from the address bar and use Skip to content; confirm visible focus.
5. Confirm the account area says Not signed in / Role unavailable and Sign out
   is disabled. Authentication will provide the real profile, role, and logout action.
6. Visit `/design-system`. Check button feedback, disabled/loading controls, empty
   Display name validation with input focus, and valid submission feedback.
7. At mobile width and 200% browser zoom, check wrapping and no horizontal scrolling.
   Check every order status badge has a readable label.

Browser interaction and visual verification require the manual checks above when no
browser is connected to Codex.

## Routing decisions

The app uses React Router's declarative `BrowserRouter`, nested `Routes`, and
`Outlet`: the layout stays mounted while its page content changes. `NavLink`
provides active-link semantics. See the [official routing guide](https://reactrouter.com/start/declarative/routing).

Routes: `/dashboard`, `/orders`, `/fulfillment`, `/delivery`, `/products`,
`/categories`, `/inventory`, `/customers`, `/suppliers`, and `/design-system`.
`/` redirects to `/dashboard`; unknown paths show the 404 page. The design-system
route is intentionally available in this checkpoint's preview build; revisit its
visibility before production. There are no protected routes or API requests yet.

Vite handles deep links locally. At the hosting checkpoint, configure the frontend
server to fall back to `index.html` for application paths so refresh/direct links
work in production; keep API routing separate. No deployment is part of this step.

Commits are manual. Suggested message for this step:
`feat: add responsive application layout and navigation`
