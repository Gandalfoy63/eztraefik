---
title: Routes
tags: [feature, routing]
version: 1.6.0+25
related: ["[[03 - Features/Services|Services]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Domains|Domains]]", "[[03 - Features/Entrypoints|Entrypoints]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Relations|Relations]]", "[[03 - Features/Config History|Config History]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[03 - Features/Overview|Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[05 - UI-UX/Preview|Preview]]", "[[03 - Features/Import from NPM|Import from NPM]]", "[[08 - Deployment/Compose Example|Compose Example]]", "[[03 - Features/Route Settings|Route Settings]]", "[[99 - Changelog/1.3.0+19|1.3.0+19]]", "[[99 - Changelog/1.5.0+22|1.5.0+22]]", "[[99 - Changelog/1.6.0+25|1.6.0+25]]"]
---

# Routes

Status: implemented in 0.2.0+3.

## Page
- One table for HTTP, TCP and UDP routes eztraefik manages: name, rule, forwarding to, HTTPS, live status from Traefik (Active, Error with the message on hover, Not loaded yet, Disabled), enable switch, edit, delete (with confirmation).
- Search and protocol filter, empty state and "no match" state.
- A second, read-only table lists routers from other providers (Docker labels).
- `#routes?new=1&host=...` or `&container=...&port=...` opens the window prefilled: used by Domains ("Add route on this domain") and Docker. Creating a route still happens only in this window.

## Wide table and opening a site
The page uses the full width, with smaller side margins, and names don't wrap. A click on a route edits it. Ctrl+click (Cmd on a Mac) opens its site in a new tab, on the name or anywhere on the row outside the controls ([routeURL](../../web/src/pages/Routes.tsx#L31-L40)). The name is a real link, so middle click works too. The address keeps a non-standard published port and the path prefix. TCP, UDP and wildcard-only routes have no address to open.

## New / edit route window
Centered window with two tabs, as approved in the preview review:
- **Common**: Name, Domain (several allowed), **Forwarding to**: Docker container (port prefilled from the container) or IP address, plus port; or a shared Service when one exists. "More options" (closed by default): protocol HTTP / TCP / UDP, entrypoints (ports), path prefix, backend uses HTTPS, middlewares, custom rule, priority.
- **Route Settings** (HTTP, on the Common tab, closed by default): named options like Max Upload Size, see [[03 - Features/Route Settings|Route Settings]].
- **Certificates**: Serve over HTTPS; a **Certificate** dropdown lists the certificates that cover every domain of the route, plus "New certificate from" each resolver (or "Keep the issued certificate" once it exists); TCP adds TLS passthrough. The details of the choice show under it. A saved choice that no longer fits stays listed as such. Redirect HTTP to HTTPS. A new route starts on the resolver of its domain, if the domain has one.
- "Generated config" shows the YAML for the draft, from [previewRoute](../../server/internal/api/routes.go#L397-L413).
- Server errors come back with the field name: the message appears under that field, the tab gets a red dot, and the window switches to it.

## Rules enforced by the server ([validateRoute](../../server/internal/api/routes.go#L97-L252))
- Names: lowercase, digits, dashes; `ezt-` is reserved; unique among routes, and not taken by a shared service (a route to a container or IP gets a service with its own name).
- Entrypoints must match the protocol (UDP vs TCP). HTTP defaults to `websecure` with HTTPS, `web` without.
- An HTTP route without HTTPS is refused on an entrypoint that redirects everything to HTTPS, because it could never answer. The same check runs the other way when an entrypoint redirect is turned on. Found by the dev test.
- Middlewares must exist with the same protocol; UDP has none.
- Targeting a container connects it to the Traefik network on save.

## Generated config
See [[04 - Architecture/Dynamic Config|Dynamic Config]]. Rule syntax: [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/routing/rules-and-priority|HTTP rules]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/tcp/routing/rules-and-priority|TCP rules]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/udp/routing/router|UDP router]].

## Code
- API: [listRoutes](../../server/internal/api/routes.go#L69-L95), [saveRoute](../../server/internal/api/routes.go#L324-L377), [deleteRoute](../../server/internal/api/routes.go#L379-L394)
- Page: [Routes](../../web/src/pages/Routes.tsx#L42-L210), window [RouteModal](../../web/src/pages/RouteModal.tsx#L32-L340)

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
- [[99 - Changelog/1.5.0+22|1.5.0+22]]
- [[99 - Changelog/1.6.0+25|1.6.0+25]]
