---
title: Compose Example
tags: [deployment, docker]
version: 1.8.1+31
related: ["[[08 - Deployment/Install|Install]]", "[[08 - Deployment/Configuration|Configuration]]", "[[03 - Features/Routes|Routes]]", "[[03 - Features/Docker|Docker]]", "[[00 - Downloaded Docs/Docker/README|Docker docs]]", "[[99 - Changelog/1.1.1+6|1.1.1+6]]", "[[04 - Architecture/Code Map|Code Map]]", "[[99 - Changelog/1.1.2+7|1.1.2+7]]", "[[99 - Changelog/1.3.1+20|1.3.1+20]]", "[[99 - Changelog/1.5.1+23|1.5.1+23]]", "[[99 - Changelog/1.7.1+27|1.7.1+27]]", "[[99 - Changelog/1.8.1+31|1.8.1+31]]"]
---

# Compose Example

[deploy/compose.example.yml](../../deploy/compose.example.yml) is a complete, commented setup: eztraefik plus two apps, routed the two ways eztraefik supports. The minimal file without apps is [deploy/compose.yml](../../deploy/compose.yml) ([[08 - Deployment/Install|Install]]).

```bash
docker compose -f deploy/compose.example.yml up -d
# open http://<server-ip>:8080 and follow the setup
```

## What is in it
| Service | Role |
|---|---|
| eztraefik | the UI and API. Mounts the Docker socket, `eztraefik-data` (back it up) and `eztraefik-shared` (also mounted into Traefik). The Traefik container is **not** in the file: setup creates it |
| whoami | an app routed **from the UI**: Routes > New route > Forwarding to "Docker container", `whoami`, port 80. No labels |
| labeled-app | an app routed **with Traefik labels**; it appears read-only under "From Docker labels" on the Routes page |

All three join the network `ezt`, which is also the network setup proposes for Traefik (`EZT_DEFAULT_NETWORK`), so Traefik reaches the apps by container name.

## Settings through variables
| Variable | Default | What |
|---|---|---|
| `EZT_PORT` | 8080 | host port of the eztraefik UI |
| `EZT_HTTP_PORT`, `EZT_HTTPS_PORT` | 80, 443 | ports setup proposes for Traefik; change them if something else (for example Nginx Proxy Manager) holds 80 / 443 |
| `EZT_SECURE_COOKIES` | 0 | 1 once the UI is served over HTTPS |
| `EZT_IMAGE` | gandasdevstudio/eztraefik:1.8.0 | the image, from [Docker Hub](https://hub.docker.com/r/gandasdevstudio/eztraefik) |

All variables eztraefik reads: [[08 - Deployment/Configuration|Configuration]]. Compose syntax: [[00 - Downloaded Docs/Docker/Compose services|services]], [[00 - Downloaded Docs/Docker/Compose networks|networks]], [[00 - Downloaded Docs/Docker/Compose volumes|volumes]].

## Removing it
Remove the Traefik container eztraefik created first (`docker rm -f traefik`): it uses the shared volume, so `docker compose down -v` can't delete the volume while it runs.

## Tested (1.1.1+6)
`docker compose config` passes. With `EZT_PORT=5182 EZT_HTTP_PORT=38080 EZT_HTTPS_PORT=38443` (to leave this host's 80 / 443 alone): setup through the API created Traefik on 38080 / 38443, a route to `whoami` created from the API answered through Traefik, and `labeled-app@docker` was listed as an active label route. Everything was removed afterwards.
- [[04 - Architecture/Code Map|Code Map]]
- [[99 - Changelog/1.1.2+7|1.1.2+7]]
- [[99 - Changelog/1.3.1+20|1.3.1+20]]
- [[99 - Changelog/1.5.1+23|1.5.1+23]]
- [[99 - Changelog/1.7.1+27|1.7.1+27]]
- [[99 - Changelog/1.8.1+31|1.8.1+31]]
