---
title: Docker
tags: [feature, docker, sources]
version: 0.2.0+3
related: ["[[03 - Features/Services|Services]]", "[[03 - Features/Relations|Relations]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]"]
---

# Docker

Status: implemented in 0.2.0+3.

- Every container on the host: image, state, exposed ports, which routes target it (eztraefik routes and label routers), and whether it is on the Traefik network.
- **Connect** puts a container on the Traefik network (saving a route to a container does it automatically).
- "New route to this container" opens the route window prefilled with the container and its first port.
- Label routes are shown read-only on the Routes page; Docker provider options are on the Traefik page.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/providers/docker|Docker provider]], [[00 - Downloaded Docs/Docker Engine API/Container|Engine API containers]].

## Code
- [listContainers](../../server/internal/api/system.go#L312-L352), client [[04 - Architecture/Docker Client|Docker Client]]
- [Docker](../../web/src/pages/Docker.tsx#L10-L80)

## Related
- [[03 - Features/Services|Services]]
- [[03 - Features/Relations|Relations]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
