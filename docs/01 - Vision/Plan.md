---
title: Plan
tags: [vision, plan]
version: 0.1.0+1
related: ["[[01 - Vision/Vision|Vision]]", "[[02 - Tech/Stack|Stack]]", "[[04 - Architecture/Overview|Architecture Overview]]", "[[03 - Features/Features Index|Features Index]]", "[[05 - UI-UX/Design Principles|Design Principles]]", "[[05 - UI-UX/Preview|Preview]]", "[[06 - API/API Overview|API Overview]]", "[[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]", "[[Home]]"]
---

# Plan

What eztraefik is, how it works, what it contains, and what is still to decide. This is a single plan, not a list of phases: everything here is in scope for `1.0.0`.

## 1. How eztraefik controls Traefik

Traefik has two kinds of configuration ([[00 - Downloaded Docs/Traefik/getting-started/configuration-overview|Configuration overview]]):

| Kind | What it holds | How eztraefik manages it |
|---|---|---|
| Install (static) config | Entrypoints (ports), providers, API, certificate resolvers, metrics, logs | Written as CLI flags / environment variables of the Traefik container. eztraefik creates and recreates that container through the Docker API. See [[00 - Downloaded Docs/Traefik/reference/static-configuration/env-ref|Env reference]]. |
| Routing (dynamic) config | Routers, services, middlewares, TLS certificates and options | Written as YAML files into a folder Traefik watches with the [[00 - Downloaded Docs/Traefik/reference/install-configuration/providers/others/file|File provider]]. Changes apply without restart. |

Reading back the live state uses the Traefik API ([[00 - Downloaded Docs/Traefik/reference/install-configuration/api-dashboard|API and dashboard]]): `/api/rawdata` gives every router, service and middleware from every provider, with status, errors and which router uses which service. That is what powers the relation views.

Containers configured with Docker labels ([[00 - Downloaded Docs/Traefik/reference/install-configuration/providers/docker|Docker provider]]) keep working. eztraefik shows them read-only next to its own routes and can convert one into a managed route.

Why the File provider and not the HTTP provider: if eztraefik is down, Traefik keeps serving the last files. With the [[00 - Downloaded Docs/Traefik/reference/install-configuration/providers/others/http|HTTP provider]] routing would depend on eztraefik being up.

Details: [[04 - Architecture/Overview|Architecture Overview]].

## 2. Navigation

A fixed sidebar on the left, grouped, always labeled. It collapses to icons with tooltips on desktop and becomes a drawer on mobile. The current page is always highlighted, and the page title plus a breadcrumb sit at the top.

| Group | Page | What you do there |
|---|---|---|
| — | Overview | Health of Traefik, counts, errors that need attention, recent changes |
| Routing | Routes | Every HTTP, TCP and UDP router. Create, edit, enable, disable. |
| Routing | Services | Backends: Docker containers, external URLs, load balancers, weighted and mirrored services |
| Routing | Middlewares | Auth, headers, redirects, rate limits, IP allow lists, and chains of them |
| Network | Domains | Every domain and subdomain, the routes on it, its certificate |
| Network | Certificates | ACME resolvers, issued certs, expiry, custom uploaded certs, TLS options |
| Network | Entrypoints | Ports Traefik listens on (80, 443, custom), HTTP to HTTPS redirects |
| Sources | Docker | Containers on the host, their networks, labels, and what routes them |
| Observe | Stats | Requests, status codes, latency per router and service (Prometheus metrics) |
| Observe | Logs | Traefik logs and access logs, filterable |
| System | Traefik | The Traefik container: image version, environment variables, static options, restart |
| System | Settings | eztraefik account, theme, backups and import / export |

Each page has one primary action at the top right ("New route", "New middleware"...). A task lives in one place: you create routes only from Routes. Other pages link to it with fields prefilled (for example "Add route on this domain" opens the same route form with the domain set).

## 3. Features

One note per feature in [[03 - Features/Features Index|Features Index]]. Short version:

- **Onboarding.** First-run wizard: detect Docker, detect or create Traefik, pick ports, add the first domain, choose how certificates are issued, create an admin account. Skippable, can be reopened from Settings. [[03 - Features/Onboarding|Onboarding]]
- **Traefik container.** Create, update, restart the Traefik container. Every static option as a form field, every environment variable editable, image tag picker, diff before apply. [[03 - Features/Traefik Container|Traefik Container]]
- **Routes.** HTTP, HTTPS, TCP (with SNI), UDP. Rule builder for Host, Path, PathPrefix, Headers, Method, Query, ClientIP with a raw rule editor as fallback. Priority, entrypoints, middlewares, TLS. [[03 - Features/Routes|Routes]]
- **Services.** Docker container, external URL ("custom API"), several servers with load balancing, health checks, sticky sessions, weighted and mirroring. [[03 - Features/Services|Services]]
- **Middlewares.** Every Traefik Proxy HTTP and TCP middleware, with a form per type. Hub-only ones are listed but marked unavailable. [[03 - Features/Middlewares|Middlewares]]
- **Domains.** Group routes by domain, wildcard support, DNS check, which entrypoints and certs apply. [[03 - Features/Domains|Domains]]
- **Certificates.** ACME resolvers (HTTP-01, TLS-ALPN-01, DNS-01 with provider credentials as env vars), list of issued certs from `acme.json`, expiry warnings, uploaded certs, TLS options. [[03 - Features/Certificates|Certificates]]
- **Entrypoints.** Add custom ports for HTTP, TCP or UDP, redirects, forwarded headers and proxy protocol trust. Applying needs a Traefik container recreate; the UI says so before applying. [[03 - Features/Entrypoints|Entrypoints]]
- **Docker.** Containers, networks, which ones Traefik can reach, label-based routes shown read-only, "Manage in eztraefik" converter. [[03 - Features/Docker|Docker]]
- **Relations.** On every router, service and container: what points to it and what it points to (entrypoint, router, middlewares, service, servers). [[03 - Features/Relations|Relations]]
- **Stats.** Request rate, status code split, latency, per entrypoint, router and service, from Traefik's Prometheus metrics. [[03 - Features/Stats|Stats]]
- **Logs.** Traefik log and access log viewer. [[03 - Features/Logs|Logs]]
- **Config preview and history.** Every save shows the generated YAML / flags, keeps a version history, allows rollback. [[03 - Features/Config History|Config History]]
- **Auth.** Single admin account for `1.0.0`, session cookie, eztraefik itself served through Traefik with HTTPS. [[03 - Features/Auth|Auth]]

## 4. Stack (proposed, needs your confirmation)

| Layer | Proposal | Why |
|---|---|---|
| Backend | Go, single binary | Same ecosystem as Traefik, official Docker SDK, small container image, no runtime |
| Frontend | React + TypeScript + Vite | Large ecosystem for forms, tables and charts |
| Styling | Tailwind CSS v4 with our own tokens | Tokens as CSS variables, no component kit look |
| Icons | Lucide | One consistent outline set, 1.5px stroke |
| Charts | uPlot or Recharts (decided when Stats is built) | Light, readable time series |
| Storage | SQLite | eztraefik state (users, history, settings). Traefik config itself lives in files. |
| Shipping | One Docker image, `docker compose` example | Needs the Docker socket and a shared config volume with Traefik |

Alternative: TypeScript end to end (Node + Fastify backend). Simpler for one language, heavier image. Full reasoning in [[02 - Tech/Stack|Stack]].

## 5. Design direction

Dark-first with a full light theme. Slate neutrals, one blue accent for actions, green / amber / red only for status. Fira Sans for text, Fira Code for values like hosts, ports and rules. Solid colors, thin borders, almost no shadows. Motion only on: page entrance, sidebar toggle, drawers and dialogs, feedback after an action. See [[05 - UI-UX/Design Principles|Design Principles]] and the [[05 - UI-UX/Preview|Preview]].

## 6. Decisions needed from you

1. **Stack**: Go backend (recommended) or TypeScript backend.
2. **Traefik ownership**: eztraefik creates and owns the Traefik container (recommended, needed for "custom vars for everything"), or it also supports attaching to an existing Traefik it does not control.
3. **Style**: confirm the preview, or say what to change. After confirmation `05 - UI-UX/Style.md` gets written.
4. **"Custom APIs"**: this plan reads it as "route to any external URL or IP:port, not only Docker containers". Correct me if you meant something else, like an API eztraefik exposes for automation.

## 7. Done means `1.0.0`

A fresh host with only Docker can: run eztraefik, finish onboarding, get Traefik running on 80/443, add two domains with Let's Encrypt certs, route one to a container and one to an external URL, add a custom TCP port, protect a route with basic auth, and see its traffic in Stats. All from the UI, with docs and changelog up to date.

## Related
- [[01 - Vision/Vision|Vision]]
- [[02 - Tech/Stack|Stack]]
- [[04 - Architecture/Overview|Architecture Overview]]
- [[03 - Features/Features Index|Features Index]]
- [[05 - UI-UX/Design Principles|Design Principles]]
- [[05 - UI-UX/Preview|Preview]]
- [[00 - Downloaded Docs/Traefik/README|Traefik docs]]
- [[06 - API/API Overview|API Overview]]
- [[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]
- [[Home]]
