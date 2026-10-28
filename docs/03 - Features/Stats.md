---
title: Stats
tags: [feature, observability]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Services|Services]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Logs|Logs]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]"]
---

# Stats

Status: planned. Not implemented yet.

## Scope
- eztraefik enables Prometheus metrics on Traefik with an internal entrypoint and scrapes it.
- Charts: requests per second, status codes (2xx / 3xx / 4xx / 5xx), latency p50 / p95, open connections. Per entrypoint, router and service.
- Range picker: 15 min, 1 h, 24 h, 7 d. Short retention in SQLite.
- Live values show the time of the last scrape and a "stale" state if Traefik stops answering.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/observability/metrics|Metrics]], [[00 - Downloaded Docs/Traefik/observe/metrics|Observe metrics]].

## Related
- [[03 - Features/Services|Services]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Logs|Logs]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
