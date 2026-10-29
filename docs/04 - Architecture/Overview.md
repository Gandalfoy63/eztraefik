---
title: Architecture Overview
tags: [architecture]
version: 0.2.0+3
related: ["[[01 - Vision/Plan|Plan]]", "[[02 - Tech/Stack|Stack]]", "[[04 - Architecture/Code Map|Code Map]]", "[[04 - Architecture/Docker Client|Docker Client]]", "[[04 - Architecture/Dynamic Config|Dynamic Config]]", "[[04 - Architecture/Frontend|Frontend]]", "[[06 - API/API Overview|API Overview]]", "[[09 - Data/Data Model|Data Model]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Config History|Config History]]", "[[08 - Deployment/Configuration|Configuration]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[99 - Changelog/0.1.0+1|0.1.0+1]]", "[[Home]]"]
---

# Architecture Overview

Status: built in 0.2.0+3.

```
            browser
               |  (direct on :8080, or through Traefik with HTTPS)
   +-----------v-----------+        Docker socket        +-------------------+
   |       eztraefik       |---------------------------->|   Docker Engine   |
   |  Go binary: REST API  |  create / replace Traefik,  |  containers,      |
   |  + embedded React UI  |  list containers, networks, |  networks, logs   |
   |  /data: state + history  connect containers         +---------+---------+
   +-----------+-----------+                                       | runs
               | writes /shared/dynamic/ezt.yml                    v
   shared volume (/shared in eztraefik, /etc/eztraefik in Traefik) Traefik
               ^                                                   |
               +---- GET /api/rawdata, /api/version, /ping, /metrics on traefik:8080 (internal network only)
```

## Parts
- **eztraefik** (one container, one static Go binary, no third-party Go modules). Serves the UI ([Handler](../../server/internal/webui/webui.go#L24-L46)) and the API ([[06 - API/API Overview|API Overview]]). Entry point and settings: [main](../../server/main.go#L42-L129), [[08 - Deployment/Configuration|Configuration]].
- **State** in `/data/state.json` plus `/data/history/` ([[09 - Data/Data Model|Data Model]]).
- **Traefik container**, created and owned by eztraefik ([[03 - Features/Traefik Container|Traefik Container]]). It gets the shared volume, the Docker socket (read-only, for label routes) and the Traefik network, with the alias `traefik`.
- **Shared volume**: `dynamic/ezt.yml` (written by eztraefik, watched by Traefik's [[00 - Downloaded Docs/Traefik/reference/install-configuration/providers/others/file|File provider]]), `acme/<resolver>.json` (written by Traefik), `certs/` (uploaded certificates), `ca/` (private ACME CAs), `logs/access.log`.
- **Network**: eztraefik connects its own container to the Traefik network at start ([EnsureSelfOnNetwork](../../server/internal/api/api.go#L331-L347)), so it reaches `http://traefik:8080` while that port stays unpublished.

## Write path (routes, services, middlewares, domains, uploaded certificates)
1. The UI sends the object. The server validates it and returns `{error, field}` on a problem.
2. [Commit](../../server/internal/api/api.go#L207-L216): update state (history entry), render the dynamic config ([[04 - Architecture/Dynamic Config|Dynamic Config]]), write `ezt.yml` atomically (temp file + rename).
3. Traefik reloads by itself. eztraefik waits 0.7 s, reads `/api/rawdata` and returns errors on its own objects as warnings.

## Install path (entrypoints, resolvers, env vars, image)
Saved first (pending), applied on the Traefik page: the container is replaced, with automatic fallback to the previous one. See [[03 - Features/Traefik Container|Traefik Container]].

## Why the File provider
If eztraefik stops, Traefik keeps serving the last file. With the HTTP provider, routing would depend on eztraefik being up.

## Related
- [[01 - Vision/Plan|Plan]]
- [[02 - Tech/Stack|Stack]]
- [[04 - Architecture/Code Map|Code Map]]
- [[04 - Architecture/Docker Client|Docker Client]]
- [[04 - Architecture/Dynamic Config|Dynamic Config]]
- [[04 - Architecture/Frontend|Frontend]]
- [[06 - API/API Overview|API Overview]]
- [[09 - Data/Data Model|Data Model]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Config History|Config History]]
- [[08 - Deployment/Configuration|Configuration]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[99 - Changelog/0.1.0+1|0.1.0+1]]
- [[Home]]
