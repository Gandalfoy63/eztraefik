---
title: Onboarding
tags: [feature, onboarding]
version: 1.2.7+16
related: ["[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Entrypoints|Entrypoints]]", "[[03 - Features/Domains|Domains]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Auth|Auth]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[05 - UI-UX/Preview|Preview]]", "[[08 - Deployment/Install|Install]]", "[[99 - Changelog/1.2.7+16|1.2.7+16]]"]
---

# Onboarding

Status: implemented in 0.2.0+3. Shown until setup is done; there is no account before it, so the setup endpoints are the only ones open without sign-in, and they refuse to run twice.

## Steps
1. **Welcome**, three lines on what happens.
2. **Docker**: checks the socket, shows version, containers, networks. Continue is blocked until Docker answers; "Check again" retries.
3. **Traefik**: lists Traefik containers already on the host. Keep it running (use other ports) or replace it: it is stopped and kept, never deleted. Image tag field.
4. **Ports**: HTTP and HTTPS ports, prefilled from `EZT_DEFAULT_HTTP_PORT` / `EZT_DEFAULT_HTTPS_PORT`. Ports already published by other containers are listed and refused. Redirect HTTP to HTTPS toggle (entrypoint-wide).
5. **Domain** (optional).
6. **Certificates**: Let's Encrypt HTTP challenge, DNS challenge (provider picker with its required variables, stored as secret env vars), or decide later. Advanced: private ACME server URL, prefilled in the dev environment with Pebble.
7. **Account**: username, password of 12+ characters, repeated.
8. **Review**, then **Create Traefik**. If Traefik fails to start, the setup is still saved and the button leads to the Traefik page to fix it.

Every step has Back; middle steps have Skip (keeps defaults). Validation errors show under the field and focus moves to the first one.

## Decisions
- Setup never offers eztraefik itself as a Traefik to replace: images are matched on their name only (`gandasdevstudio/eztraefik` contains "traefik" but is eztraefik), and asking to replace eztraefik's own container is refused before anything is saved ([isOtherTraefik](../../server/internal/api/setup.go#L276-L288), [isSelf](../../server/internal/api/setup.go#L291-L298)). Before 1.2.7+16, choosing it stopped eztraefik in the middle of setup: the browser showed "NetworkError" and Traefik was never created.
- A non-eztraefik container that already uses the Traefik container name is renamed to `<name>-before-ezt` and stopped, so Apply can never delete it.

## Code
- [onboardingCheck](../../server/internal/api/setup.go#L34-L76), [onboardingComplete](../../server/internal/api/setup.go#L95-L185), defaults in [DefaultTraefik](../../server/internal/api/setup.go#L19-L32)
- [Onboarding](../../web/src/pages/Onboarding.tsx#L28-L332)

## Related
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Entrypoints|Entrypoints]]
- [[03 - Features/Domains|Domains]]
- [[03 - Features/Certificates|Certificates]]
- [[03 - Features/Auth|Auth]]
- [[03 - Features/Docker|Docker]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
- [[05 - UI-UX/Preview|Preview]]
- [[08 - Deployment/Install|Install]]
- [[99 - Changelog/1.2.7+16|1.2.7+16]]
