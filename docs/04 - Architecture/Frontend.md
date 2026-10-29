---
title: Frontend
tags: [architecture, frontend]
version: 0.2.0+3
related: ["[[04 - Architecture/Overview|Overview]]", "[[05 - UI-UX/Style|Style]]", "[[05 - UI-UX/Components|Components]]", "[[05 - UI-UX/Navigation|Navigation]]", "[[04 - Architecture/Code Map|Code Map]]", "[[00 - Downloaded Docs/React/README|README]]", "[[00 - Downloaded Docs/Vite/README|README]]", "[[00 - Downloaded Docs/TypeScript/README|README]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[02 - Tech/Stack|Stack]]", "[[06 - API/API Overview|API Overview]]", "[[08 - Deployment/Docker Image|Docker Image]]", "[[Home]]"]
---

# Frontend

React 19 + TypeScript 7 + Vite 8, three runtime dependencies (react, react-dom, lucide-react). No router, form or data library: the app is small enough that a hash router, a fetch hook and plain components stay simpler.

- **Entry**: [web/index.html](../../web/index.html) and [web/src/main.tsx](../../web/src/main.tsx) (StrictMode, [[00 - Downloaded Docs/React/reference/createRoot|createRoot]]).
- **Gate**: [App](../../web/src/app/App.tsx#L31-L61) shows setup, sign-in or the app from `/api/v1/meta`. A 401 anywhere returns to sign-in.
- **Routing**: hash based ([useLocation](../../web/src/app/router.ts#L16-L24)), so reloads and deep links work without server routes, and query params prefill forms (`#routes?new=1&host=...`).
- **Data**: [useLoad](../../web/src/ui/hooks.ts#L13-L44) loads on mount and polls while the tab is visible. API client and types: [api](../../web/src/api.ts#L39-L44).
- **Shell**: [Shell](../../web/src/app/Shell.tsx#L99-L237) ([[05 - UI-UX/Navigation|Navigation]]).
- **Build**: `npm run build` type-checks then bundles to `web/dist`, which the Docker build copies into the Go binary ([Handler](../../server/internal/webui/webui.go#L18-L40)). Dev: `npm run dev` proxies `/api` to a Go server on :8080 ([web/vite.config.ts](../../web/vite.config.ts), [[00 - Downloaded Docs/Vite/config/server-options|server options]]).
- Fonts are self-hosted ([web/src/fonts.css](../../web/src/fonts.css)): a self-hosted tool should not call Google on every page load.

## Related
- [[04 - Architecture/Overview|Overview]]
- [[05 - UI-UX/Style|Style]]
- [[05 - UI-UX/Components|Components]]
- [[05 - UI-UX/Navigation|Navigation]]
- [[04 - Architecture/Code Map|Code Map]]
- [[00 - Downloaded Docs/React/README|README]]
- [[00 - Downloaded Docs/Vite/README|README]]
- [[00 - Downloaded Docs/TypeScript/README|README]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[02 - Tech/Stack|Stack]]
- [[06 - API/API Overview|API Overview]]
- [[08 - Deployment/Docker Image|Docker Image]]
- [[Home]]
