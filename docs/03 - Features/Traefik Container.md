---
title: Traefik Container
tags: [feature, traefik, docker]
version: 0.2.0+3
related: ["[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Entrypoints|Entrypoints]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Stats|Stats]]", "[[03 - Features/Logs|Logs]]", "[[03 - Features/Config History|Config History]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[04 - Architecture/Docker Client|Docker Client]]", "[[04 - Architecture/Overview|Architecture Overview]]", "[[03 - Features/Import from NPM|Import from NPM]]"]
---

# Traefik Container

Status: implemented in 0.2.0+3. Page: System > Traefik. This is the **only** place where the container is recreated (Apply) or restarted; other pages that change install settings show a "Saved, not applied" banner linking here.

## How it works
- The install config ([TraefikConfig](../../server/internal/store/model.go#L45-L59)) becomes CLI flags ([Flags](../../server/internal/traefik/container.go#L24-L102)) and environment variables ([Env](../../server/internal/traefik/container.go#L105-L122)). Option names come from [[00 - Downloaded Docs/Traefik/reference/install-configuration/configuration-options|Configuration options]].
- Always on: internal entrypoint `traefik` on :8080 with the API, ping and Prometheus metrics (never published unless the dashboard port is set), File provider on the shared volume.
- A hash of flags, env, image and ports is stored as a container label ([Hash](../../server/internal/traefik/container.go#L125-L140)). If it differs from the saved config, the change is **pending**; the page shows a diff of flags and env vars.
- **Apply** ([Apply](../../server/internal/traefik/container.go#L212-L269)): ensure network, prepare the shared folder, pull the image if missing, stop and rename the current container, create and start the new one, wait 1.5 s, and if it is not running (bad flag) restore the previous one and report its last log lines.
- Environment variables: free list, values marked secret are never sent back to the browser ([masked](../../server/internal/api/system.go#L128-L138)); leaving a secret empty keeps the stored value.
- Extra flags: anything not covered, one per line, must start with `--`.
- Published ports: one per entrypoint with a host port; HTTP/3 also publishes UDP on the same port.

## Code
- API: [getTraefik](../../server/internal/api/system.go#L179-L204), [putTraefik](../../server/internal/api/system.go#L206-L253), [ApplyTraefik](../../server/internal/api/system.go#L264-L282), validation [validateTraefik](../../server/internal/api/system.go#L21-L125)
- Page: [TraefikPage](../../web/src/pages/Traefik.tsx#L13-L177), shared hooks [PendingBanner](../../web/src/pages/traefikConfig.tsx#L28-L40)

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
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
- [[04 - Architecture/Docker Client|Docker Client]]
- [[04 - Architecture/Overview|Architecture Overview]]
- [[03 - Features/Import from NPM|Import from NPM]]
