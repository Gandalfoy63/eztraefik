---
title: Services
tags: [feature, routing]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Relations|Relations]]", "[[03 - Features/Stats|Stats]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]"]
---

# Services

Status: planned. Not implemented yet.

Backends routes send traffic to.

## Types
- **Docker container**: pick container and port, eztraefik fills the URL on the shared network.
- **External URL**: any `http(s)://host:port` or IP:port. This is what the brief calls "custom APIs".
- **Load balancer**: several servers, weights, health check (path, interval, timeout), sticky sessions, pass host header, servers transport (TLS to backend, timeouts).
- **Weighted**: split traffic between services (canary).
- **Mirroring**: copy traffic to other services.
- **Failover**: primary and fallback service.
- TCP and UDP services: list of addresses.

Reference: [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/load-balancing/service|HTTP service]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/load-balancing/serverstransport|Servers transport]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/tcp/service|TCP service]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/udp/service|UDP service]].

Server health per server is shown from `/api/rawdata` (`serverStatus`).

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Docker|Docker]]
- [[03 - Features/Relations|Relations]]
- [[03 - Features/Stats|Stats]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
