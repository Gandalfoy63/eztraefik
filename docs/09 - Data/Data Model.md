---
title: Data Model
tags: [data]
version: 0.2.0+3
related: ["[[04 - Architecture/Overview|Overview]]", "[[03 - Features/Config History|Config History]]", "[[02 - Tech/Stack|Stack]]", "[[04 - Architecture/Code Map|Code Map]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[Home]]"]
---

# Data Model

Everything eztraefik stores is one JSON document, `/data/state.json`, written atomically ([WriteFileAtomic](../../server/internal/store/store.go#L181-L203)). Types: [State](../../server/internal/store/model.go#L8-L19).

| Field | Type | Notes |
|---|---|---|
| onboarded, admin | bool, [Admin](../../server/internal/store/model.go#L21-L24) | PBKDF2 hash, never in history or exports |
| traefik | [TraefikConfig](../../server/internal/store/model.go#L27-L41) | image, container name, network, [Entrypoint](../../server/internal/store/model.go#L43-L53)s, [Resolver](../../server/internal/store/model.go#L55-L64)s, env, extra flags, log, providers, dashboard port |
| applied | TraefikConfig | the config the running container was created with, for the pending diff |
| routes | [Route](../../server/internal/store/model.go#L73-L87)[] | with [Target](../../server/internal/store/model.go#L89-L96) and [RouteTLS](../../server/internal/store/model.go#L98-L106) |
| services | [Service](../../server/internal/store/model.go#L109-L123)[] | shared services |
| middlewares | [Middleware](../../server/internal/store/model.go#L147-L154)[] | type + Traefik config passed through |
| domains | [Domain](../../server/internal/store/model.go#L156-L160)[] | default resolver, wildcard |
| certificates | [UploadedCert](../../server/internal/store/model.go#L162-L168)[] | metadata; PEM files live in the shared volume |

History: `/data/history/<8-digit id>.json`, each with time, user, message and the full state minus the account; the last 200 are kept ([Store](../../server/internal/store/store.go#L20-L24)).

Why not SQLite (the plan's first idea): the state is small, read as a whole and saved as a whole. A JSON file needs no database module, is easy to back up and to read by hand.

## Related
- [[04 - Architecture/Overview|Overview]]
- [[03 - Features/Config History|Config History]]
- [[02 - Tech/Stack|Stack]]
- [[04 - Architecture/Code Map|Code Map]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[Home]]
