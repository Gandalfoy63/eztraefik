---
title: Overview
tags: [feature, dashboard]
version: 1.0.0+4
related: ["[[03 - Features/Relations|Relations]]", "[[03 - Features/Stats|Stats]]", "[[03 - Features/Routes|Routes]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[99 - Changelog/1.0.0+4|1.0.0+4]]"]
---

# Overview

Status: implemented in 0.2.0+3.

The first page after sign-in: what Traefik serves and what needs attention.

## What it shows
- Four stat tiles (empty values say "None yet" instead of a misleading "all good"): routes (by protocol), services (servers down), certificates (expiring), requests per second with a one-hour sparkline. Each tile links to its page.
- **Needs attention**: Traefik missing or not running, settings not applied, route / service / middleware errors reported by Traefik, servers down, certificates expiring (warning at 14 days, error at 3).
- **Recent changes**: the last six history entries.
- **Traffic paths**: the [[03 - Features/Relations|Relations]] strips for the first six routes.
- Polls every 10 seconds. The sidebar counts come from the same endpoint every 15 seconds.

## Code
- API: [overview](../../server/internal/api/observe.go#L178-L270). eztraefik's redirect helper routers (`*-redirect@file`) are not counted.
- Page: [Overview](../../web/src/pages/Overview.tsx#L22-L117)

## Related
- [[03 - Features/Relations|Relations]]
- [[03 - Features/Stats|Stats]]
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Certificates|Certificates]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
- [[99 - Changelog/1.0.0+4|1.0.0+4]]
