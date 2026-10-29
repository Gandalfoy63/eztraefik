---
title: Docker Client
tags: [architecture, docker]
version: 1.1.0+5
related: ["[[04 - Architecture/Overview|Overview]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Logs|Logs]]", "[[04 - Architecture/Code Map|Code Map]]", "[[00 - Downloaded Docs/Docker Engine API/README|README]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[Home]]", "[[99 - Changelog/1.1.0+5|1.1.0+5]]"]
---

# Docker Client

A small client for the Docker Engine API over the Unix socket, plain `net/http`, pinned to API **v1.47** (Docker Engine 27 and later). No Docker SDK module.

| Call | Used for | Engine API page |
|---|---|---|
| [Version](../../server/internal/docker/docker.go#L118-L123) | onboarding check | [[00 - Downloaded Docs/Docker Engine API/System|System]] |
| [Containers](../../server/internal/docker/docker.go#L164-L172), [Inspect](../../server/internal/docker/docker.go#L221-L225) | Docker page, route targets, status | [[00 - Downloaded Docs/Docker Engine API/Container|Container]] |
| [Create](../../server/internal/docker/docker.go#L269-L275), Start, Stop, Rename, Remove, Restart | replacing Traefik | [[00 - Downloaded Docs/Docker Engine API/Container|Container]], [[00 - Downloaded Docs/Docker Engine API/Definitions|Definitions]] |
| [Logs](../../server/internal/docker/docker.go#L307-L348) | Traefik log (8-byte frame headers decoded) | [[00 - Downloaded Docs/Docker Engine API/Container|Container]] |
| [Pull](../../server/internal/docker/docker.go#L369-L393) | image pull, waits for the JSON progress stream | [[00 - Downloaded Docs/Docker Engine API/Image|Image]] |
| [EnsureNetwork](../../server/internal/docker/docker.go#L426-L435), [Connect](../../server/internal/docker/docker.go#L437-L444) | Traefik network, connecting targets | [[00 - Downloaded Docs/Docker Engine API/Network|Network]] |
| [EnsureVolume](../../server/internal/docker/docker.go#L448-L455) | shared volume | [[00 - Downloaded Docs/Docker Engine API/Volume|Volume]] |
| [ArchiveRead](../../server/internal/docker/docker.go#L357-L364) | copying NPM's access list files | [[00 - Downloaded Docs/Docker Engine API/Container|Container]], [[00 - Downloaded Docs/Go/archive-tar|archive/tar]] |

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
- [[99 - Changelog/1.1.0+5|1.1.0+5]]
