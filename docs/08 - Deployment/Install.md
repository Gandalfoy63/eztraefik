---
title: Install
tags: [deployment]
version: 1.3.1+20
related: ["[[08 - Deployment/Configuration|Configuration]]", "[[08 - Deployment/Docker Image|Docker Image]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Auth|Auth]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[04 - Architecture/Code Map|Code Map]]", "[[Home]]", "[[99 - Changelog/1.1.1+6|1.1.1+6]]", "[[99 - Changelog/1.1.2+7|1.1.2+7]]", "[[99 - Changelog/1.3.1+20|1.3.1+20]]"]
---

# Install

On a host with Docker:

```bash
docker compose -f deploy/compose.yml up -d     # pulls gandasdevstudio/eztraefik:1.3.0 from Docker Hub
```

Open `http://<server-ip>:8080` and follow the setup ([[03 - Features/Onboarding|Onboarding]]). Compose file: [deploy/compose.yml](../../deploy/compose.yml). A fuller, commented one with example apps: [[08 - Deployment/Compose Example|Compose Example]].

## Serve eztraefik over HTTPS
1. In eztraefik, create a route: name `eztraefik`, your admin domain, forwarding to the Docker container `eztraefik`, port `8080`, HTTPS on. Optionally add an IP allow list middleware.
2. Set `EZT_SECURE_COOKIES=1`, remove the `ports:` line, and `docker compose up -d` again.

## Upgrade
Pull the new image and recreate the eztraefik container. Traefik keeps running during the upgrade; state in `/data` is kept.

## Remove
`docker compose -f deploy/compose.yml down`, then remove the Traefik container eztraefik created (`docker rm -f traefik`, before removing volumes: it uses the shared one) and the volumes if you want.

## Related
- [[08 - Deployment/Configuration|Configuration]]
- [[08 - Deployment/Docker Image|Docker Image]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Auth|Auth]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[04 - Architecture/Code Map|Code Map]]
- [[Home]]
- [[99 - Changelog/1.1.1+6|1.1.1+6]]
- [[99 - Changelog/1.1.2+7|1.1.2+7]]
- [[99 - Changelog/1.3.1+20|1.3.1+20]]
