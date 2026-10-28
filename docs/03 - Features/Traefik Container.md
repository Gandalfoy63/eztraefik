---
title: Traefik Container
tags: [feature, traefik, docker]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Entrypoints|Entrypoints]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Stats|Stats]]", "[[03 - Features/Logs|Logs]]", "[[03 - Features/Config History|Config History]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[04 - Architecture/Overview|Architecture Overview]]"]
---

# Traefik Container

Status: planned. Not implemented yet.

The System > Traefik page. eztraefik owns the Traefik container's install (static) configuration.

## Scope
- Status, uptime, Traefik version (from `/api/version`), image tag, restart / recreate.
- **Static options as forms**, grouped like the reference: entrypoints, providers, API and dashboard, certificate resolvers, metrics, logs, access logs, tracing, experimental. Source: [[00 - Downloaded Docs/Traefik/reference/static-configuration/cli-ref|CLI reference]] and [[00 - Downloaded Docs/Traefik/reference/static-configuration/env-ref|Env reference]].
- **Environment variables**: free key/value list for anything (DNS provider tokens, `TZ`...). Secret values are masked and stored encrypted.
- Volumes and networks the container joins.
- **Apply** shows a diff of flags and env vars, warns that the container will be recreated (a few seconds of downtime), then recreates it.

## Notes
- Options not covered by a form stay reachable through an "Extra flags" field, so nothing Traefik supports is blocked.

## Related
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Entrypoints|Entrypoints]]
- [[03 - Features/Certificates|Certificates]]
- [[03 - Features/Docker|Docker]]
- [[03 - Features/Stats|Stats]]
- [[03 - Features/Logs|Logs]]
- [[03 - Features/Config History|Config History]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[04 - Architecture/Overview|Architecture Overview]]
