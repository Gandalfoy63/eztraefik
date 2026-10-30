---
title: Stats
tags: [feature, observability]
version: 0.2.0+3
related: ["[[03 - Features/Services|Services]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Logs|Logs]]", "[[03 - Features/Overview|Overview]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]"]
---

# Stats

Status: implemented in 0.2.0+3.

- eztraefik scrapes Traefik's Prometheus endpoint every 15 s ([Collector](../../server/internal/traefik/metrics.go#L110-L120)) and keeps one point per minute per series for 7 days, in memory (lost on restart).
- Series: all traffic (sum of entrypoints), each entrypoint, router and service. Per point: requests, 2xx / 3xx / 4xx / 5xx, latency sum, p95 estimated from histogram buckets. Counter resets after a Traefik restart are handled.
- Page: picker for the series, range 15 min / 1 h / 24 h / 7 days (bucketed to at most about 180 points), summary tiles, four single-measure charts, table view, open connections, "updated N ago" with a stale warning.
- Chart rules: [[05 - UI-UX/Charts|Charts]].

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/observability/metrics|Metrics]].

## Code
- [ParseProm](../../server/internal/traefik/metrics.go#L24-L62), [stats](../../server/internal/api/observe.go#L21-L55)
- [Stats](../../web/src/pages/Stats.tsx#L27-L94), chart [LineChart](../../web/src/ui/LineChart.tsx#L21-L23)

## Related
- [[03 - Features/Services|Services]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Logs|Logs]]
- [[03 - Features/Overview|Overview]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
