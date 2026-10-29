---
title: Data Model
tags: [data]
version: 1.1.0+5
related: ["[[04 - Architecture/Overview|Overview]]", "[[03 - Features/Config History|Config History]]", "[[02 - Tech/Stack|Stack]]", "[[04 - Architecture/Code Map|Code Map]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[Home]]", "[[03 - Features/Import from NPM|Import from NPM]]", "[[99 - Changelog/1.1.0+5|1.1.0+5]]"]
---

# Data Model

Everything eztraefik stores is one JSON document, `/data/state.json`, written atomically ([WriteFileAtomic](../../server/internal/store/store.go#L181-L203)). Types: [State](../../server/internal/store/model.go#L8-L21).

| Field | Type | Notes |
|---|---|---|
| onboarded, admin | bool, [Admin](../../server/internal/store/model.go#L35-L38) | PBKDF2 hash, never in history or exports |
| traefik | [TraefikConfig](../../server/internal/store/model.go#L41-L55) | image, container name, network, [Entrypoint](../../server/internal/store/model.go#L57-L67)s, [Resolver](../../server/internal/store/model.go#L69-L78)s, env, extra flags, log, providers, dashboard port |
| applied | TraefikConfig | the config the running container was created with, for the pending diff |
| routes | [Route](../../server/internal/store/model.go#L87-L101)[] | with [Target](../../server/internal/store/model.go#L103-L110) and [RouteTLS](../../server/internal/store/model.go#L112-L120) |
| services | [Service](../../server/internal/store/model.go#L123-L137)[] | shared services |
| middlewares | [Middleware](../../server/internal/store/model.go#L161-L168)[] | type + Traefik config passed through |
| domains | [Domain](../../server/internal/store/model.go#L170-L174)[] | default resolver, wildcard |
| migration | [Migration](../../server/internal/store/model.go#L23-L33) | NPM source, import time and count, stream ports, switch time, Traefik's ports before the switch |
| certificates | [UploadedCert](../../server/internal/store/model.go#L176-L182)[] | metadata; PEM files live in the shared volume |

History: `/data/history/<8-digit id>.json`, each with time, user, message and the full state minus the account; the last 200 are kept ([Store](../../server/internal/store/store.go#L20-L24)).

Why not SQLite (the plan's first idea): the state is small, read as a whole and saved as a whole. A JSON file needs no database module, is easy to back up and to read by hand.

## Related
- [[04 - Architecture/Overview|Overview]]
- [[03 - Features/Config History|Config History]]
- [[02 - Tech/Stack|Stack]]
- [[04 - Architecture/Code Map|Code Map]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[Home]]
- [[03 - Features/Import from NPM|Import from NPM]]
- [[99 - Changelog/1.1.0+5|1.1.0+5]]
