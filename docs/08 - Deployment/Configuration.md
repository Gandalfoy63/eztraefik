---
title: Configuration
tags: [deployment, configuration]
version: 0.2.0+3
related: ["[[08 - Deployment/Install|Install]]", "[[08 - Deployment/Docker Image|Docker Image]]", "[[08 - Deployment/Dev Environment|Dev Environment]]", "[[04 - Architecture/Overview|Overview]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[04 - Architecture/Code Map|Code Map]]", "[[Home]]", "[[08 - Deployment/Compose Example|Compose Example]]"]
---

# Configuration

eztraefik reads environment variables at start ([main](../../server/main.go#L42-L129)). Everything else is configured in the UI.

| Variable | Default | What |
|---|---|---|
| `EZT_LISTEN` | `:8080` | address the UI and API listen on |
| `EZT_DATA_DIR` | `/data` | state.json and history |
| `EZT_SHARED_DIR` | `/shared` | the shared volume inside eztraefik |
| `EZT_SHARED_VOLUME` | `detected` | Docker volume name of the shared volume, mounted into Traefik. Detected from eztraefik's own mounts; set it when detection fails |
| `EZT_DOCKER_HOST` | `unix:///var/run/docker.sock` | Docker Engine address |
| `EZT_HOST_DOCKER_SOCKET` | `/var/run/docker.sock` | host path of the socket, bind-mounted into Traefik for label routes |
| `EZT_TRAEFIK_API` | `http://traefik:8080` | Traefik's internal API (alias on the Traefik network) |
| `EZT_SECURE_COOKIES` | | 1 = session cookie only over HTTPS |
| `EZT_DEFAULT_HTTP_PORT / EZT_DEFAULT_HTTPS_PORT` | `80 / 443` | ports proposed in setup |
| `EZT_DEFAULT_NETWORK` | `ezt` | Traefik network proposed in setup |
| `EZT_DEFAULT_TRAEFIK_NAME` | `traefik` | Traefik container name |
| `EZT_DEFAULT_ACME_CA_SERVER / EZT_DEFAULT_ACME_CA_CERT_FILE` | | private ACME server and its CA proposed in setup (dev: Pebble) |
| `EZT_DEV` | | 1 = shows a Dev environment badge in setup |

Volumes: `/data` (keep it: account, config, history) and `/shared` (a **named** volume, so it can be mounted into Traefik too). The Docker socket must be mounted.

## Related
- [[08 - Deployment/Install|Install]]
- [[08 - Deployment/Docker Image|Docker Image]]
- [[08 - Deployment/Dev Environment|Dev Environment]]
- [[04 - Architecture/Overview|Overview]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[04 - Architecture/Code Map|Code Map]]
- [[Home]]
- [[08 - Deployment/Compose Example|Compose Example]]
