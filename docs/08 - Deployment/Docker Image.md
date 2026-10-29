---
title: Docker Image
tags: [deployment, docker]
version: 0.2.0+3
related: ["[[08 - Deployment/Install|Install]]", "[[08 - Deployment/Configuration|Configuration]]", "[[08 - Deployment/Dev Environment|Dev Environment]]", "[[04 - Architecture/Frontend|Frontend]]", "[[00 - Downloaded Docs/Docker/README|README]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[02 - Tech/Stack|Stack]]", "[[04 - Architecture/Code Map|Code Map]]", "[[Home]]"]
---

# Docker Image

Built from [Dockerfile](../../Dockerfile) in three stages ([[00 - Downloaded Docs/Docker/Multi-stage builds|multi-stage builds]]):
1. `node:24.11.1-alpine` builds the web UI (`npm ci`, type check, Vite build).
2. `golang:1.27.3-alpine` builds a static binary with the UI embedded and the version from `VERSION` (`-X main.version`).
3. `gcr.io/distroless/static-debian12` (pinned by digest) runs it. About 19 MB. Runs as root because it uses the Docker socket. Health check: `eztraefik healthcheck`.

## Build and publish
```bash
docker build -t eztraefik:$(cat VERSION | cut -d+ -f1) .
tools/publish.sh ghcr.io/<you>/eztraefik        # multi-arch (amd64, arm64) build and push
```
[tools/publish.sh](../../tools/publish.sh) tags `<version>`, `<major>.<medium>` and `latest`, and needs `docker login` to the registry first.

## Related
- [[08 - Deployment/Install|Install]]
- [[08 - Deployment/Configuration|Configuration]]
- [[08 - Deployment/Dev Environment|Dev Environment]]
- [[04 - Architecture/Frontend|Frontend]]
- [[00 - Downloaded Docs/Docker/README|README]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[02 - Tech/Stack|Stack]]
- [[04 - Architecture/Code Map|Code Map]]
- [[Home]]
