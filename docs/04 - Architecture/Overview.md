---
title: Architecture Overview
tags: [architecture]
version: 0.1.0+1
status: proposed
related: ["[[01 - Vision/Plan|Plan]]", "[[02 - Tech/Stack|Stack]]", "[[04 - Architecture/Code Map|Code Map]]", "[[06 - API/API Overview|API Overview]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Config History|Config History]]", "[[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]", "[[Home]]"]
---

# Architecture Overview

Status: proposed.

```
            browser
               |
          HTTPS (Traefik)
               |
   +-----------v-----------+        Docker socket        +-------------------+
   |       eztraefik       |---------------------------->|   Docker Engine   |
   |  web UI + REST API    |  create / recreate Traefik, |  containers,      |
   |  SQLite (state)       |  list containers, networks  |  networks         |
   +-----------+-----------+                             +---------+---------+
               | writes YAML                                       |
               v                                                   | runs
   shared volume: /dynamic/*.yml  <------ File provider ------  Traefik
               ^                                                   |
               +---- reads /api/rawdata, /metrics (internal) ------+
```

## Parts
- **eztraefik container**: one process serving the UI and a REST API ([[06 - API/API Overview|API Overview]]). Talks to Docker through the mounted socket.
- **Traefik container**: created and owned by eztraefik. Install config comes from flags and env vars eztraefik sets ([[03 - Features/Traefik Container|Traefik Container]]). Routing config comes from the [[00 - Downloaded Docs/Traefik/reference/install-configuration/providers/others/file|File provider]] (eztraefik's files) and the [[00 - Downloaded Docs/Traefik/reference/install-configuration/providers/docker|Docker provider]] (labels, read-only in eztraefik).
- **Shared volume**: the dynamic config folder, plus certificate storage (`acme.json`) mounted read-only into eztraefik.
- **Internal network**: Traefik API and metrics are on an internal entrypoint reachable only by eztraefik ([[00 - Downloaded Docs/Traefik/reference/install-configuration/api-dashboard|API and dashboard]]).

## Write path
1. User saves a form.
2. Backend validates, renders YAML, writes it atomically (temp file then rename).
3. Snapshot stored in SQLite ([[03 - Features/Config History|Config History]]).
4. Traefik reloads the file. Backend polls `/api/rawdata` and reports new errors back to the UI.

Static changes (entrypoints, resolvers, env vars) take the recreate path instead: diff shown, user confirms, container recreated.

## Related
- [[01 - Vision/Plan|Plan]]
- [[02 - Tech/Stack|Stack]]
- [[04 - Architecture/Code Map|Code Map]]
- [[06 - API/API Overview|API Overview]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Config History|Config History]]
- [[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]
- [[Home]]
