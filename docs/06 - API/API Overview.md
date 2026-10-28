---
title: API Overview
tags: [api]
version: 0.1.0+1
status: planned
related: ["[[04 - Architecture/Overview|Architecture Overview]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]", "[[Home]]"]
---

# API Overview

Status: planned. The eztraefik REST API the web UI uses. Defined once the stack is confirmed.

Planned shape: JSON over `/api/v1`, one resource per feature (`/routes`, `/services`, `/middlewares`, `/domains`, `/certificates`, `/entrypoints`, `/docker/containers`, `/traefik`, `/stats`, `/logs`, `/history`). Each mutation returns the generated config and the Traefik status after apply.

It is separate from Traefik's own API ([[00 - Downloaded Docs/Traefik/reference/install-configuration/api-dashboard|Traefik API]]), which eztraefik only reads internally.

## Related
- [[04 - Architecture/Overview|Architecture Overview]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]
- [[Home]]
