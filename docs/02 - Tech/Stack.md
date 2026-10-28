---
title: Stack
tags: [tech]
version: 0.1.0+1
status: proposed
related: ["[[01 - Vision/Plan|Plan]]", "[[04 - Architecture/Overview|Architecture Overview]]", "[[00 - Downloaded Docs/Traefik/README|Traefik docs]]", "[[00 - Downloaded Docs/Lucide/README|Lucide docs]]", "[[00 - Downloaded Docs/Google Fonts/README|Google Fonts docs]]", "[[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]", "[[Home]]"]
---

# Stack

Status: proposed, waiting for confirmation. Nothing below is installed yet except what the style preview uses.

## In use now
| Tech | Version | Used for | Docs |
|---|---|---|---|
| Traefik | v3.7.16 | The proxy eztraefik manages | [[00 - Downloaded Docs/Traefik/README|Traefik docs]] |
| Lucide | 1.56.0 | Icons (vendored UMD build in the preview) | [[00 - Downloaded Docs/Lucide/README|Lucide docs]] |
| Fira Sans, Fira Code | Google Fonts CSS2 | Type | [[00 - Downloaded Docs/Google Fonts/README|Google Fonts docs]] |

## Proposed for the app

| Layer | Option A (recommended) | Option B |
|---|---|---|
| Backend | Go: `net/http`, Docker Engine SDK, `gopkg.in/yaml.v3` | Node + TypeScript: Fastify, `dockerode`, `yaml` |
| Frontend | React + TypeScript + Vite | same |
| Styling | Tailwind CSS v4, theme mapped to our tokens | same |
| Data fetching | TanStack Query | same |
| Storage | SQLite | same |
| Image | Distroless, about 25 MB | Node slim, about 180 MB |

Why A: Traefik and Docker are Go projects, so their types and client libraries are first class; one static binary is easy to ship and to run next to Traefik; low memory on small home servers.

Why B: one language for the whole repo.

Once chosen, each technology's official docs get downloaded into `00 - Downloaded Docs/` before any code uses it.

## Related
- [[01 - Vision/Plan|Plan]]
- [[04 - Architecture/Overview|Architecture Overview]]
- [[00 - Downloaded Docs/Traefik/README|Traefik docs]]
- [[00 - Downloaded Docs/Lucide/README|Lucide docs]]
- [[00 - Downloaded Docs/Google Fonts/README|Google Fonts docs]]
- [[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]
- [[Home]]
