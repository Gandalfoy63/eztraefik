---
title: Docker Image
tags: [deployment, docker]
version: 1.7.1+27
related: ["[[08 - Deployment/Install|Install]]", "[[08 - Deployment/Configuration|Configuration]]", "[[08 - Deployment/Dev Environment|Dev Environment]]", "[[04 - Architecture/Frontend|Frontend]]", "[[00 - Downloaded Docs/Docker/README|README]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[02 - Tech/Stack|Stack]]", "[[04 - Architecture/Code Map|Code Map]]", "[[Home]]", "[[99 - Changelog/1.0.0+4|1.0.0+4]]", "[[99 - Changelog/1.1.2+7|1.1.2+7]]", "[[05 - UI-UX/Logo|Logo]]", "[[99 - Changelog/1.2.2+10|1.2.2+10]]", "[[99 - Changelog/1.2.7+16|1.2.7+16]]", "[[99 - Changelog/1.2.8+17|1.2.8+17]]", "[[99 - Changelog/1.2.9+18|1.2.9+18]]", "[[99 - Changelog/1.3.1+20|1.3.1+20]]", "[[99 - Changelog/1.5.1+23|1.5.1+23]]", "[[99 - Changelog/1.7.1+27|1.7.1+27]]"]
---

# Docker Image

Built from [Dockerfile](../../Dockerfile) in three stages ([[00 - Downloaded Docs/Docker/Multi-stage builds|multi-stage builds]]):
1. `node:24.11.1-alpine` builds the web UI (`npm ci`, type check, Vite build), on the build machine's platform.
2. `golang:1.27.3-alpine` cross-compiles a static binary for each target (`GOOS` / `GOARCH` from `TARGETOS` / `TARGETARCH`), with the UI embedded and the version from `VERSION` (`-X main.version`). So an arm64 image builds as fast as amd64, without emulation.
3. `gcr.io/distroless/static-debian12` (pinned by digest) runs it. About 19 MB. Runs as root because it uses the Docker socket. Health check: `eztraefik healthcheck`.

## Published on Docker Hub
**[gandasdevstudio/eztraefik](https://hub.docker.com/r/gandasdevstudio/eztraefik)**, public, `linux/amd64` and `linux/arm64`.

| Tag | Image version | Pushed |
|---|---|---|
| `1.7.0`, `1.7`, `latest` | 1.7.0+26 (domains on a resolver, certificate dropdown on routes, apply and check after saving a resolver) | 2026-10-30 |
| `1.5.0`, `1.5` | 1.5.0+22 (certificate deletion keeps routes, DNS provider list, Docker stacks, domain detection, sortable tables) | 2026-10-30 |
| `1.3.0`, `1.3` | 1.3.0+19 (custom nginx config converted at NPM import, Route Settings) | 2026-10-30 |
| `1.2.8`, `1.2` | 1.2.8+17 (NPM import: Let's Encrypt email falls back to the NPM account) | 2026-10-29 |
| `1.2.7` | 1.2.7+16 (setup no longer offers to replace eztraefik itself) | 2026-10-29 |
| `1.2.1` | 1.2.1+9 (new logo) | 2026-10-29 |
| `1.1.1`, `1.1` | 1.1.1+6 | 2026-10-29, digest `sha256:9c1e90fcf799e2ed291649829215286dbf50e674e4c805bad4261f2e1cc72363` |

```bash
docker pull gandasdevstudio/eztraefik:1.7.0
```

Checked after the push: both platforms in the manifest list, repository public, a fresh pull starts and reports 1.1.1+6.

To publish a new version: bump `VERSION`, commit, then `tools/publish.sh docker.io/gandasdevstudio/eztraefik` (needs `docker login`).

The page text and logo: [[08 - Deployment/Docker Hub Page|Docker Hub Page]].

## Release 1.0.0
- Local image: `eztraefik:1.0.0` (19.4 MB, amd64), label `org.opencontainers.image.version=1.0.0+4`.
- File: `dist/eztraefik-1.0.0-amd64.tar.gz` (4.7 MB, not in git). Load it elsewhere with `docker load < eztraefik-1.0.0-amd64.tar.gz`.
- arm64 build checked with `docker buildx build --platform linux/arm64`.
- Tags never contain the `+BUILD` part (registries forbid `+`); it is in the image label.

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
- [[99 - Changelog/1.0.0+4|1.0.0+4]]
- [[99 - Changelog/1.1.2+7|1.1.2+7]]
- [[05 - UI-UX/Logo|Logo]]
- [[99 - Changelog/1.2.2+10|1.2.2+10]]
- [[99 - Changelog/1.2.7+16|1.2.7+16]]
- [[99 - Changelog/1.2.8+17|1.2.8+17]]
- [[99 - Changelog/1.2.9+18|1.2.9+18]]
- [[99 - Changelog/1.3.1+20|1.3.1+20]]
- [[99 - Changelog/1.5.1+23|1.5.1+23]]
- [[99 - Changelog/1.7.1+27|1.7.1+27]]
