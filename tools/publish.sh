#!/usr/bin/env bash
# Docs: docs/08 - Deployment/Docker Image.md
# Builds the eztraefik image for amd64 and arm64 and pushes it.
# Usage: tools/publish.sh ghcr.io/<you>/eztraefik      (run `docker login ghcr.io` first)
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE="${1:?usage: tools/publish.sh <registry/name>}"
FULL="$(cat VERSION)"            # 1.0.0+4
VERSION="${FULL%%+*}"            # 1.0.0, tags can't contain +
MINOR="${VERSION%.*}"            # 1.0
docker buildx build --platform linux/amd64,linux/arm64 \
  --label "org.opencontainers.image.version=$FULL" \
  -t "$IMAGE:$VERSION" -t "$IMAGE:$MINOR" -t "$IMAGE:latest" \
  --push .
echo "Pushed $IMAGE:$VERSION ($FULL), $IMAGE:$MINOR and $IMAGE:latest"
