<p><img src="marketing/logo/final/svg/static/lockup-light.svg" alt="eztraefik" width="360"></p>

# eztraefik

A self-hosted web app to run and manage [Traefik](https://traefik.io/traefik/): it creates the Traefik container and lets you edit everything from one UI.

- Routes for HTTP, HTTPS, TCP and UDP, on any port, to Docker containers or to any IP address
- Shared services: load balancing, health checks, weighted splits, failover, mirroring
- Middlewares: basic auth, IP allow lists, forward auth, redirects, headers, rate limits and more
- Domains, Let's Encrypt resolvers (HTTP, TLS, DNS challenge), uploaded certificates
- Traefik settings and environment variables, applied with automatic fallback
- Relations, stats, access and Traefik logs, history with restore
- Import from Nginx Proxy Manager, then switch its ports to Traefik (and back) in one click

## Run

Image: [`gandasdevstudio/eztraefik`](https://hub.docker.com/r/gandasdevstudio/eztraefik) on Docker Hub (amd64, arm64).

```bash
docker compose -f deploy/compose.yml up -d
```

Open `http://<server-ip>:8080` and follow the setup. Details: `docs/08 - Deployment/Install.md`.

A commented example with apps routed from the UI and with Traefik labels: `deploy/compose.example.yml`.

## Try it without touching ports 80 / 443

```bash
docker compose -f dev/compose.yml up -d --build
python3 dev/test.py
```

Fake domains `*.ezt.test`, ports 18080 / 18443, and Pebble as a test ACME server. See `docs/08 - Deployment/Dev Environment.md`.

## Docs

The `docs/` folder is an Obsidian vault. Start at `docs/Home.md`.
