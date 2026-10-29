---
title: Traefik documentation (downloaded)
tags: [downloaded-docs, traefik]
version: 0.2.0+3
related: ["[[Home]]", "[[02 - Tech/Stack|Stack]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]"]
---

# Traefik documentation

| Field | Value |
|---|---|
| Source | https://github.com/traefik/traefik/tree/v3.7.16/docs/content (rendered at https://doc.traefik.io/traefik/) |
| Version | v3.7.16 (latest release, published 2026-10-20) |
| Downloaded | 2026-10-28 |
| Format | Original MkDocs Markdown. Emoji and check-mark symbols replaced with words. |

## What is kept

Only the parts eztraefik uses. Excluded: Kubernetes, Swarm, KV/HashiCorp/ECS-like providers, contributing, migration and deprecation guides, images.

| Topic | Path |
|---|---|
| Docker provider | [[reference/install-configuration/providers/docker|Docker provider]], [[expose/docker/basic|Expose with Docker]], [[expose/docker/advanced|Docker advanced]] |
| File provider (what eztraefik writes) | [[reference/install-configuration/providers/others/file|File provider]] |
| HTTP provider | [[reference/install-configuration/providers/others/http|HTTP provider]] |
| Entrypoints (ports) | [[reference/install-configuration/entrypoints|Entrypoints]] |
| API and dashboard | [[reference/install-configuration/api-dashboard|API and dashboard]] |
| HTTP routers and rules | [[reference/routing-configuration/http/routing/router|HTTP router]], [[reference/routing-configuration/http/routing/rules-and-priority|Rules and priority]] |
| HTTP services | [[reference/routing-configuration/http/load-balancing/service|HTTP service]], [[reference/routing-configuration/http/load-balancing/serverstransport|Servers transport]] |
| HTTP middlewares | [[reference/routing-configuration/http/middlewares/overview|Middlewares overview]] |
| TCP / UDP | [[reference/routing-configuration/tcp/routing/router|TCP router]], [[reference/routing-configuration/udp/routing/router|UDP router]] |
| TLS and certificates | [[reference/routing-configuration/http/tls/overview|TLS overview]], [[reference/routing-configuration/http/tls/tls-certificates|TLS certificates]], [[reference/routing-configuration/http/tls/tls-options|TLS options]] |
| ACME / Let's Encrypt | [[reference/install-configuration/tls/certificate-resolvers/acme|ACME resolver]] |
| Metrics, logs, health | [[reference/install-configuration/observability/metrics|Metrics]], [[reference/install-configuration/observability/logs-and-accesslogs|Logs and access logs]], [[reference/install-configuration/observability/healthcheck|Healthcheck]] |
| Install (static) options, full list | [[reference/install-configuration/configuration-options|Configuration options]]. Each option `a.b.c` is the CLI flag `--a.b.c` and the env var `TRAEFIK_A_B_C`. (`static-configuration/cli-ref.md` and `env-ref.md` are empty upstream: they are generated at docs build time.) |

## Traefik Hub only

These middlewares are documented here but need a Traefik Hub licence, so eztraefik will show them as unavailable on Traefik Proxy: apikey, jwt, hmac, distributed-ratelimit, oidc, opa, waf, ldap, oauth2-token-introspection, oauth2-client-credentials.

## Related
- [[Home]]
- [[02 - Tech/Stack|Stack]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]
