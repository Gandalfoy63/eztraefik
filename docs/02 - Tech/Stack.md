---
title: Stack
tags: [tech]
version: 1.4.0+21
related: ["[[01 - Vision/Plan|Plan]]", "[[04 - Architecture/Overview|Overview]]", "[[04 - Architecture/Frontend|Frontend]]", "[[09 - Data/Data Model|Data Model]]", "[[08 - Deployment/Docker Image|Docker Image]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[00 - Downloaded Docs/Traefik/README|README]]", "[[00 - Downloaded Docs/Go/README|README]]", "[[00 - Downloaded Docs/Docker Engine API/README|README]]", "[[00 - Downloaded Docs/React/README|README]]", "[[00 - Downloaded Docs/Vite/README|README]]", "[[00 - Downloaded Docs/TypeScript/README|README]]", "[[00 - Downloaded Docs/Lucide/README|README]]", "[[00 - Downloaded Docs/Google Fonts/README|README]]", "[[00 - Downloaded Docs/Docker/README|README]]", "[[00 - Downloaded Docs/Pebble/README|README]]", "[[00 - Downloaded Docs/whoami/README|README]]", "[[04 - Architecture/Code Map|Code Map]]", "[[99 - Changelog/0.1.0+1|0.1.0+1]]", "[[Home]]", "[[00 - Downloaded Docs/fontTools/README|README]]", "[[00 - Downloaded Docs/nginx/README|nginx docs]]", "[[00 - Downloaded Docs/lego/README|lego docs]]"]
---

# Stack

Confirmed in 0.2.0+3. The brief asked for "the fastest language": Go is the fastest of the options with first-class Docker and Traefik tooling (Rust is a bit faster at runtime, but has no official Docker SDK and builds much slower).

| Layer | Choice | Version | Docs |
|---|---|---|---|
| Proxy managed | Traefik Proxy | v3.7.16 | [[00 - Downloaded Docs/Traefik/README|Traefik]] |
| Backend | Go, standard library only (net/http, embed, crypto/pbkdf2, log/slog) | 1.27.3 | [[00 - Downloaded Docs/Go/README|Go]] |
| Docker access | Engine API over the socket, own client | API v1.47 | [[00 - Downloaded Docs/Docker Engine API/README|Docker Engine API]] |
| Frontend | React | 19.3.1 | [[00 - Downloaded Docs/React/README|React]] |
| Build | Vite with @vitejs/plugin-react | 8.3.4 / 6.1.2 | [[00 - Downloaded Docs/Vite/README|Vite]] |
| Language | TypeScript (strict) | 7.0.2 | [[00 - Downloaded Docs/TypeScript/README|TypeScript]] |
| Icons | lucide-react (preview: lucide 1.56.0) | 1.57.0 | [[00 - Downloaded Docs/Lucide/README|Lucide]] |
| Fonts | Fira Sans, Fira Code, self-hosted woff2 | Google Fonts CSS2 | [[00 - Downloaded Docs/Google Fonts/README|Google Fonts]] |
| Storage | one JSON file + history snapshots | | [[09 - Data/Data Model|Data Model]] |
| Image | multi-stage Dockerfile, distroless static | | [[00 - Downloaded Docs/Docker/README|Docker]] |
| Import source | Nginx Proxy Manager API (read only) | 2.15.1 | [[00 - Downloaded Docs/Nginx Proxy Manager/README|NPM]] |
| ACME DNS providers | lego (inside Traefik) | 5.5.2 | [[00 - Downloaded Docs/lego/README|lego docs]] |
| Import source | nginx config syntax (read only) | current docs | [[00 - Downloaded Docs/nginx/README|nginx docs]] |
| Dev environment | Pebble (test ACME CA), whoami / whoamitcp / whoamiudp | 2.8.0, 1.11.0, 0.3.0, 0.2.0 | [[00 - Downloaded Docs/Pebble/README|Pebble]], [[00 - Downloaded Docs/whoami/README|whoami]] |

## Changes from the proposal
- **No Tailwind**: the approved preview already had a complete token-based stylesheet. Reusing it kept the look identical and removed a dependency.
- **No TanStack Query, no router library, no chart library**: a 40-line fetch hook, a hash router and one SVG chart component cover what the app needs ([[04 - Architecture/Frontend|Frontend]]).
- **JSON file instead of SQLite**: see [[09 - Data/Data Model|Data Model]].
- **PBKDF2 instead of Argon2id**: in the standard library ([[03 - Features/Auth|Auth]]).
- Exact versions: npm packages pinned in `web/package.json`; base images pinned in the Dockerfile.

## Related
- [[01 - Vision/Plan|Plan]]
- [[04 - Architecture/Overview|Overview]]
- [[04 - Architecture/Frontend|Frontend]]
- [[09 - Data/Data Model|Data Model]]
- [[08 - Deployment/Docker Image|Docker Image]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[00 - Downloaded Docs/Traefik/README|README]]
- [[00 - Downloaded Docs/Go/README|README]]
- [[00 - Downloaded Docs/Docker Engine API/README|README]]
- [[00 - Downloaded Docs/React/README|README]]
- [[00 - Downloaded Docs/Vite/README|README]]
- [[00 - Downloaded Docs/TypeScript/README|README]]
- [[00 - Downloaded Docs/Lucide/README|README]]
- [[00 - Downloaded Docs/Google Fonts/README|README]]
- [[00 - Downloaded Docs/Docker/README|README]]
- [[00 - Downloaded Docs/Pebble/README|README]]
- [[00 - Downloaded Docs/whoami/README|README]]
- [[04 - Architecture/Code Map|Code Map]]
- [[99 - Changelog/0.1.0+1|0.1.0+1]]
- [[Home]]
- [[00 - Downloaded Docs/fontTools/README|README]]
- [[00 - Downloaded Docs/nginx/README|nginx docs]]
- [[00 - Downloaded Docs/lego/README|lego docs]]
