---
title: Relations
tags: [feature, routing, observability]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Services|Services]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]"]
---

# Relations

Status: planned. Not implemented yet.

Shows how traffic flows: entrypoint, router, middlewares, service, servers or container.

## Scope
- A flow strip on every router, service and container detail page, each node clickable.
- Status per node (ok / warning / error) from `/api/rawdata`, which carries `usedBy` and status for every object.
- A full map view on Overview for the whole host, filterable by domain.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/api-dashboard|API endpoints]].

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Services|Services]]
- [[03 - Features/Docker|Docker]]
- [[03 - Features/Middlewares|Middlewares]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
