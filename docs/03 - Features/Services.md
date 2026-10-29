---
title: Services
tags: [feature, routing]
version: 0.2.0+3
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Relations|Relations]]", "[[03 - Features/Stats|Stats]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[04 - Architecture/Dynamic Config|Dynamic Config]]"]
---

# Services

Status: implemented in 0.2.0+3.

Routes to one container or one address get their own service automatically. This page manages **shared** services, used when a route needs more:
- **Load balancer**: several servers (URLs for HTTP, host:port for TCP/UDP), health check path / interval / timeout, sticky sessions (cookie), skip TLS verification for self-signed backends (shared servers transport `ezt-insecure`).
- **Weighted split** between services (canary), **Failover** (main and fallback), **Mirroring** (copy a percent of traffic).

Second table: **Health in Traefik**, every service from every provider with each server's UP/DOWN state from `/api/rawdata` and what uses it.

Renames and deletes are blocked while a route or another service refers to the service.

Reference: [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/load-balancing/service|HTTP service]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/tcp/service|TCP service]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/udp/service|UDP service]].

## Code
- [validateService](../../server/internal/api/resources.go#L70-L150), [saveService](../../server/internal/api/resources.go#L152-L199), rendering [renderService](../../server/internal/traefik/dynamic.go#L263-L317)
- [Services](../../web/src/pages/Services.tsx#L142-L238)

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Docker|Docker]]
- [[03 - Features/Relations|Relations]]
- [[03 - Features/Stats|Stats]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
- [[04 - Architecture/Dynamic Config|Dynamic Config]]
