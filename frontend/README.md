# SME Operations frontend

Separate React + TypeScript + Vite application for the Laravel API in `../backend`.

## Current step

The frontend foundation is ready: a minimal welcome screen, strict TypeScript,
Oxlint (from the official Vite template), and a production build. API integration,
authentication, Tailwind, navigation, and business pages will be added in separate
steps. The welcome screen does not connect to the backend or display business data.

## Run locally

Use Node.js 22.12+ or 24+ (verified with Node.js 24.11.0) and npm.
From the workspace root in PowerShell:

```powershell
Set-Location -LiteralPath '.\frontend'
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open http://127.0.0.1:5173. Expect the SME Operations welcome screen.
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
- `src/App.tsx`: initial application component.
- `src/index.css` and `src/App.css`: minimal temporary styles before the Tailwind step.
- `tsconfig.app.json`: strict checks for application code.
- `tsconfig.node.json`: strict checks for Vite configuration.
- `.oxlintrc.json`: lint configuration including React hook rules.
- `vite.config.ts`: React integration with Vite.
- `package-lock.json`: locked dependency versions; use `npm ci` on a fresh checkout.

Consult `../BACKEND_API_CONTRACT.md` before implementing API clients. Role responses
and conflict handling are available; pending-stock retry, delivery lookup/ownership,
and workflow reads still have documented gaps.

Commits are manual. Suggested message for this step:
`feat: initialize React TypeScript frontend`
