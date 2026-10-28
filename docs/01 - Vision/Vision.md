---
title: Vision
tags: [vision]
version: 0.1.0+1
related: ["[[01 - Vision/Plan|Plan]]", "[[Home]]", "[[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]"]
---

# Vision

eztraefik is a self-hosted web app to run and manage Traefik without hand-editing YAML or Docker labels.

One place to:
- create and configure the Traefik container itself, with every static setting and environment variable,
- see which Docker containers are exposed and how they connect to routers and services,
- add routes of any kind (HTTP, HTTPS, TCP, UDP, custom ports) to containers or to any external URL,
- manage several domains and their certificates,
- see live traffic and health stats.

## Who it is for
People who self-host services on one or a few Docker hosts. They know what a domain and a port are; they should not need to know Traefik's config syntax.

## Principles
- **Everything Traefik can do is reachable**, but common tasks come first and advanced options sit behind a clear "Advanced" section.
- **Traefik stays the source of truth at runtime.** eztraefik writes config Traefik reads; if eztraefik stops, routing keeps working.
- **Show the generated config.** Every form has a read-only preview of the YAML / labels it produces, so nothing is magic.
- **Calm interface.** See [[05 - UI-UX/Design Principles|Design Principles]].

## Related
- [[01 - Vision/Plan|Plan]]
- [[Home]]
- [[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]
