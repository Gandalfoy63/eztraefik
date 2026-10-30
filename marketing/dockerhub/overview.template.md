{{LOGO}}

**eztraefik** is a self-hosted web app that runs and manages [Traefik](https://traefik.io/traefik/) for you. It creates the Traefik container, and everything Traefik can do is a form: no YAML, no labels.

Source code, docs and issues: **[github.com/Gandalfoy63/eztraefik](https://github.com/Gandalfoy63/eztraefik)** (MIT).

## What you can do
- **Routes** for HTTP, HTTPS, TCP and UDP, on any port, to a Docker container or to any IP address
- **HTTPS** with Let's Encrypt (HTTP, TLS or DNS challenge), wildcard domains, or your own certificates
- **Middlewares**: basic auth, IP allow lists, forward auth (Authelia, Authentik), redirects, headers, rate limits
- **Services** with several servers, health checks, weighted splits, failover and mirroring
- **Traefik itself**: version, settings and environment variables, applied with automatic fallback
- **Stats, access log and Traefik log**, traffic paths from port to app, history with one-click restore
- **Import from Nginx Proxy Manager**, then move its ports to Traefik, and back, in one click

## Quick start
```yaml
services:
  eztraefik:
    image: gandasdevstudio/eztraefik:1.8.0
    container_name: eztraefik
    restart: unless-stopped
    environment:
      EZT_SHARED_VOLUME: eztraefik-shared
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - eztraefik-data:/data
      - eztraefik-shared:/shared
    ports:
      - "8080:8080"
volumes:
  eztraefik-data: { name: eztraefik-data }
  eztraefik-shared: { name: eztraefik-shared }
```
Then open `http://<server-ip>:8080`. The setup creates Traefik on ports 80 and 443 (or the ports you choose), your first domain and your account.

## Good to know
- eztraefik needs the Docker socket: it creates the Traefik container and lists your containers.
- `/data` holds your account, config and history: back it up. `/shared` is mounted into Traefik too.
- After setup you can serve eztraefik itself over HTTPS with a route to the container `eztraefik`, port 8080.
- Traefik keeps running if eztraefik stops: the routes live in a file Traefik reads.

## Tags
| Tag | |
|---|---|
| `1.8.0`, `1.8`, `latest` | current release, `linux/amd64` and `linux/arm64` |

Image: about 20 MB, a static Go binary on distroless. Traefik v3.7.16 by default.
