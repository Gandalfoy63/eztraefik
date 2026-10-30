---
title: Routes
tags: [feature, routing]
version: 1.3.0+19
related: ["[[03 - Features/Services|Services]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Domains|Domains]]", "[[03 - Features/Entrypoints|Entrypoints]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Relations|Relations]]", "[[03 - Features/Config History|Config History]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[03 - Features/Overview|Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[05 - UI-UX/Preview|Preview]]", "[[03 - Features/Import from NPM|Import from NPM]]", "[[08 - Deployment/Compose Example|Compose Example]]", "[[03 - Features/Route Settings|Route Settings]]", "[[99 - Changelog/1.3.0+19|1.3.0+19]]"]
---

# Routes

Status: implemented in 0.2.0+3.

## Page
- One table for HTTP, TCP and UDP routes eztraefik manages: name, rule, forwarding to, HTTPS, live status from Traefik (Active, Error with the message on hover, Not loaded yet, Disabled), enable switch, edit, delete (with confirmation).
- Search and protocol filter, empty state and "no match" state.
- A second, read-only table lists routers from other providers (Docker labels).
- `#routes?new=1&host=...` or `&container=...&port=...` opens the window prefilled: used by Domains ("Add route on this domain") and Docker. Creating a route still happens only in this window.

## New / edit route window
Centered window with two tabs, as approved in the preview review:
- **Common**: Name, Domain (several allowed), **Forwarding to**: Docker container (port prefilled from the container) or IP address, plus port; or a shared Service when one exists. "More options" (closed by default): protocol HTTP / TCP / UDP, entrypoints (ports), path prefix, backend uses HTTPS, middlewares, custom rule, priority.
- **Route Settings** (HTTP, on the Common tab, closed by default): named options like Max Upload Size, see [[03 - Features/Route Settings|Route Settings]].
- **Certificates**: Serve over HTTPS; certificate choice lists only certificates that cover every domain of the route, plus "Generate a new certificate" per resolver (or "Keep using the issued certificate" once it exists); TCP adds TLS passthrough; Redirect HTTP to HTTPS.
- "Generated config" shows the YAML for the draft, from [previewRoute](../../server/internal/api/routes.go#L392-L408).
- Server errors come back with the field name: the message appears under that field, the tab gets a red dot, and the window switches to it.

## Rules enforced by the server ([validateRoute](../../server/internal/api/routes.go#L97-L247))
- Names: lowercase, digits, dashes; `ezt-` is reserved; unique among routes, and not taken by a shared service (a route to a container or IP gets a service with its own name).
- Entrypoints must match the protocol (UDP vs TCP). HTTP defaults to `websecure` with HTTPS, `web` without.
- An HTTP route without HTTPS is refused on an entrypoint that redirects everything to HTTPS, because it could never answer. The same check runs the other way when an entrypoint redirect is turned on. Found by the dev test.
- Middlewares must exist with the same protocol; UDP has none.
- Targeting a container connects it to the Traefik network on save.

## Generated config
See [[04 - Architecture/Dynamic Config|Dynamic Config]]. Rule syntax: [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/routing/rules-and-priority|HTTP rules]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/tcp/routing/rules-and-priority|TCP rules]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/udp/routing/router|UDP router]].

## Code
- API: [listRoutes](../../server/internal/api/routes.go#L69-L95), [saveRoute](../../server/internal/api/routes.go#L319-L372), [deleteRoute](../../server/internal/api/routes.go#L374-L389)
- Page: [Routes](../../web/src/pages/Routes.tsx#L29-L181), window [RouteModal](../../web/src/pages/RouteModal.tsx#L28-L355)

## Related
- [[03 - Features/Services|Services]]
- [[03 - Features/Middlewares|Middlewares]]
- [[03 - Features/Domains|Domains]]
- [[03 - Features/Entrypoints|Entrypoints]]
- [[03 - Features/Certificates|Certificates]]
- [[03 - Features/Relations|Relations]]
- [[03 - Features/Config History|Config History]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[03 - Features/Overview|Overview]]
- [[04 - Architecture/Code Map|Code Map]]
- [[05 - UI-UX/Preview|Preview]]
- [[03 - Features/Import from NPM|Import from NPM]]
- [[08 - Deployment/Compose Example|Compose Example]]
- [[03 - Features/Route Settings|Route Settings]]
- [[99 - Changelog/1.3.0+19|1.3.0+19]]
