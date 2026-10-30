---
title: Entrypoints
tags: [feature, network]
version: 0.2.0+3
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[03 - Features/Import from NPM|Import from NPM]]"]
---

# Entrypoints

Status: implemented in 0.2.0+3.

- Ports Traefik listens on: name, TCP or UDP, port inside Traefik, published host port (or not published).
- TCP options: redirect every request to another entrypoint over HTTPS, issue certificates for every route on it, HTTP/3, trusted proxy IPs (kept X-Forwarded-* headers).
- Redirects use the **published** port when it is not 443 (needed for the dev ports 18080 / 18443).
- Port 8080 inside Traefik is reserved for its API. Duplicate ports or names, and redirects to unknown entrypoints, are refused. Deleting one used by a route is refused.
- Saving changes the config; the port opens when Traefik is recreated on the Traefik page.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/entrypoints|Entrypoints]].

## Code
- Flags [Flags](../../server/internal/traefik/container.go#L24-L105), ports [Spec](../../server/internal/traefik/container.go#L153-L195)
- [Entrypoints](../../web/src/pages/Entrypoints.tsx#L13-L141)

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
- [[03 - Features/Import from NPM|Import from NPM]]
