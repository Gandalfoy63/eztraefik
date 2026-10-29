---
title: Logs
tags: [feature, observability]
version: 0.2.0+3
related: ["[[03 - Features/Stats|Stats]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[04 - Architecture/Docker Client|Docker Client]]"]
---

# Logs

Status: implemented in 0.2.0+3.

- **Access log**: Traefik writes JSON lines to the shared volume; eztraefik reads the last 4 MB and shows time, status, method + host + path, route, client, duration. Filters: text (host, path, client), status class.
- **Traefik log**: the container's stdout / stderr from the Docker API (multiplexed stream decoded), level parsed from Traefik's format, level and text filters.
- Live refresh every 5 s with Pause / Resume.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/observability/logs-and-accesslogs|Logs and access logs]].

## Code
- [accessLogs](../../server/internal/api/observe.go#L91-L151), [traefikLogs](../../server/internal/api/observe.go#L57-L88), [Logs](../../server/internal/docker/docker.go#L292-L333)
- [Logs](../../web/src/pages/Logs.tsx#L13-L77)

## Related
- [[03 - Features/Stats|Stats]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
- [[04 - Architecture/Docker Client|Docker Client]]
