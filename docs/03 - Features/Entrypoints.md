---
title: Entrypoints
tags: [feature, network]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]"]
---

# Entrypoints

Status: planned. Not implemented yet.

Ports Traefik listens on.

## Scope
- List: name, address (`:443`, `:5432/udp`...), protocol, routes using it, published host port.
- Create: name, port, TCP or UDP, publish on host (adds the port mapping to the Traefik container).
- HTTP options: redirect to another entrypoint (HTTP to HTTPS), default TLS and cert resolver for every router on it, default middlewares.
- Advanced: forwarded headers trusted IPs, proxy protocol, transport timeouts, HTTP/3.
- Saving shows "Traefik will restart to open this port" before applying.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/entrypoints|Entrypoints]].

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
