#!/usr/bin/env bash
# Docs: docs/08 - Deployment/Dev Environment.md
# Removes the dev environment completely: its containers, the Traefik container eztraefik created, volumes and network.
set -euo pipefail
cd "$(dirname "$0")"
docker rm -f ezt-dev-traefik ezt-dev-traefik-ezt-previous >/dev/null 2>&1 || true
docker compose -f compose.yml down -v --remove-orphans
