# SME Operations frontend

Separate React + TypeScript + Vite application for the Laravel API in `../backend`.

## Current step

Step 2 adds Tailwind CSS 4 through its Vite plugin and the first reusable UI
components. The initial screen is a component preview with colors, typography,
buttons, inputs, cards, and order status badges. Its interactions are local examples;
they do not connect to the backend or display business data. API integration,
authentication, navigation, and business pages will follow in separate steps.

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

Open http://127.0.0.1:5173. Expect the SME Operations component preview.
Use Ctrl+C to stop the server. Edit `src/App.tsx` to see Vite update the page.

## Quality checks

```powershell
npm run typecheck
npm run lint
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Preview serves the production build at http://127.0.0.1:4173. It is a local check,
not a production hosting server. Build output is in `dist/` and is ignored by Git.
No automated behavior tests exist at this foundation step; add them with meaningful
application behavior rather than a placeholder test command.

The scripts invoke each installed tool through Node directly. This avoids npm's
Windows `.cmd` wrappers, whose unquoted path assignment fails on the `&` in this
workspace name. These relative Node commands also work on Linux and in Docker.

## Files to know

- `index.html`: browser document, metadata, and React mounting element.
- `src/main.tsx`: mounts React with StrictMode and imports global styles.
- `src/App.tsx`: mounts the temporary component preview.
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

1. Tab through controls and confirm visible focus; use the skip link to reach content.
2. Activate each enabled example button and check its feedback text.
3. Confirm disabled/loading examples cannot be activated.
4. Submit an empty Display name: expect an error linked to the field and focus on the input.
5. Enter a name and submit: expect a local success message. No API request is made.
6. At mobile width, confirm sections stack and buttons/statuses wrap without horizontal scrolling.
7. Check every order status badge has a readable label.

Browser interaction and visual verification require the manual checks above when no
browser is connected to Codex.

Commits are manual. Suggested message for this step:
`feat: add Tailwind theme and reusable UI primitives`
