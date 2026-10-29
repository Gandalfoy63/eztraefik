---
title: Docker Client
tags: [architecture, docker]
version: 0.2.0+3
related: ["[[04 - Architecture/Overview|Overview]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Logs|Logs]]", "[[04 - Architecture/Code Map|Code Map]]", "[[00 - Downloaded Docs/Docker Engine API/README|README]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[Home]]"]
---

# Docker Client

A small client for the Docker Engine API over the Unix socket, plain `net/http`, pinned to API **v1.47** (Docker Engine 27 and later). No Docker SDK module.

| Call | Used for | Engine API page |
|---|---|---|
| [Version](../../server/internal/docker/docker.go#L118-L123) | onboarding check | [[00 - Downloaded Docs/Docker Engine API/System|System]] |
| [Containers](../../server/internal/docker/docker.go#L164-L172), [Inspect](../../server/internal/docker/docker.go#L206-L210) | Docker page, route targets, status | [[00 - Downloaded Docs/Docker Engine API/Container|Container]] |
| [Create](../../server/internal/docker/docker.go#L254-L260), Start, Stop, Rename, Remove, Restart | replacing Traefik | [[00 - Downloaded Docs/Docker Engine API/Container|Container]], [[00 - Downloaded Docs/Docker Engine API/Definitions|Definitions]] |
| [Logs](../../server/internal/docker/docker.go#L292-L333) | Traefik log (8-byte frame headers decoded) | [[00 - Downloaded Docs/Docker Engine API/Container|Container]] |
| [Pull](../../server/internal/docker/docker.go#L344-L368) | image pull, waits for the JSON progress stream | [[00 - Downloaded Docs/Docker Engine API/Image|Image]] |
| [EnsureNetwork](../../server/internal/docker/docker.go#L401-L410), [Connect](../../server/internal/docker/docker.go#L412-L419) | Traefik network, connecting targets | [[00 - Downloaded Docs/Docker Engine API/Network|Network]] |
| [EnsureVolume](../../server/internal/docker/docker.go#L423-L430) | shared volume | [[00 - Downloaded Docs/Docker Engine API/Volume|Volume]] |

Errors carry the Engine status code ([Error](../../server/internal/docker/docker.go#L52-L55)); "not found" is checked with [IsNotFound](../../server/internal/docker/docker.go#L59-L62).

## Related
- [[04 - Architecture/Overview|Overview]]
- [[03 - Features/Docker|Docker]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Logs|Logs]]
- [[04 - Architecture/Code Map|Code Map]]
- [[00 - Downloaded Docs/Docker Engine API/README|README]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[Home]]
