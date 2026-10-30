---
title: Relations
tags: [feature, routing, observability]
version: 0.2.0+3
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Services|Services]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Overview|Overview]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]"]
---

# Relations

Status: implemented in 0.2.0+3.

A strip per router: entrypoint, route (rule, error badge), middlewares, service (servers, down count). Built in the browser from Traefik's `/api/rawdata`, which carries every object, its status and what uses it. Shown on Overview; each node links to its page.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/api-dashboard|API endpoints]].

## Code
- [runtime](../../server/internal/api/observe.go#L159-L168), [RawData](../../server/internal/traefik/api.go#L72-L81)
- [Relations](../../web/src/pages/Relations.tsx#L33-L95)

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Services|Services]]
- [[03 - Features/Docker|Docker]]
- [[03 - Features/Middlewares|Middlewares]]
- [[03 - Features/Overview|Overview]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
