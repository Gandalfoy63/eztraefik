---
title: Docker
tags: [feature, docker, sources]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Services|Services]]", "[[03 - Features/Relations|Relations]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]"]
---

# Docker

Status: planned. Not implemented yet.

## Scope
- Containers on the host: name, image, state, networks, exposed ports, Traefik labels.
- Whether Traefik can reach each container (shared network), with a one-click "Connect to Traefik network".
- Routes and services that point to the container, from eztraefik and from labels.
- Label-based config shown read-only with the parsed router / service / middleware.
- "Manage in eztraefik": copies the label config into a managed route; the user removes labels themselves.
- Docker provider options (exposedByDefault, network, constraints) are edited on the Traefik page.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/providers/docker|Docker provider]], [[00 - Downloaded Docs/Traefik/expose/docker/basic|Expose with Docker]], [[00 - Downloaded Docs/Traefik/expose/docker/advanced|Docker advanced]].

## Related
- [[03 - Features/Services|Services]]
- [[03 - Features/Relations|Relations]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
