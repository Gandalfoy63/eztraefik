# syntax=docker/dockerfile:1
# Docs: docs/08 - Deployment/Docker Image.md
# Reference: docs/00 - Downloaded Docs/Docker/Multi-stage builds.md

# 1. Web UI
FROM --platform=$BUILDPLATFORM node:24.11.1-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# 2. Go server, with the UI embedded. The version comes from the VERSION file.
# Cross-compiles on the build machine for each target platform (amd64, arm64).
FROM --platform=$BUILDPLATFORM golang:1.27.3-alpine AS server
ARG TARGETOS TARGETARCH
WORKDIR /src
COPY server/go.mod ./
COPY server/ ./
COPY --from=web /web/dist ./internal/webui/dist
COPY VERSION /VERSION
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags "-s -w -X main.version=$(cat /VERSION)" -o /out/eztraefik . \
 && mkdir -p /out/data /out/shared

# 3. Runtime: static binary on distroless. Runs as root because it talks to the Docker socket.
FROM gcr.io/distroless/static-debian12@sha256:d75cdd72874d4790092fcb1b058493ecf6bb5bf2b2b897045b00ff01d91843f2
COPY --from=server /out/eztraefik /eztraefik
COPY --from=server /out/data /data
COPY --from=server /out/shared /shared
ENV EZT_LISTEN=:8080 EZT_DATA_DIR=/data EZT_SHARED_DIR=/shared
VOLUME ["/data", "/shared"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD ["/eztraefik", "healthcheck"]
LABEL org.opencontainers.image.title="eztraefik" \
      org.opencontainers.image.description="Web UI to run and manage Traefik: routes, services, middlewares, domains, certificates, ports, Docker and stats." \
      org.opencontainers.image.licenses="MIT"
ENTRYPOINT ["/eztraefik"]
