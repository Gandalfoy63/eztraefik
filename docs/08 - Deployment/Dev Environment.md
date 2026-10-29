---
title: Dev Environment
tags: [deployment, dev, testing]
version: 1.1.0+5
related: ["[[08 - Deployment/Configuration|Configuration]]", "[[08 - Deployment/Docker Image|Docker Image]]", "[[04 - Architecture/Dynamic Config|Dynamic Config]]", "[[00 - Downloaded Docs/Pebble/README|README]]", "[[00 - Downloaded Docs/whoami/README|README]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[01 - Vision/Plan|Plan]]", "[[04 - Architecture/Code Map|Code Map]]", "[[Home]]", "[[99 - Changelog/1.0.0+4|1.0.0+4]]", "[[99 - Changelog/1.1.0+5|1.1.0+5]]"]
---

# Dev Environment

A virtual environment to try eztraefik with **fake domains** (`*.ezt.test`) and **fake ports**, without touching the host's 80 / 443 (in use here by another proxy).

```bash
docker compose -f dev/compose.yml up -d --build   # build eztraefik and start everything
python3 dev/test.py                                # end-to-end test, 30 checks
dev/down.sh                                        # remove it all, including the Traefik container
```

UI: `http://<host>:5181` (dev account in the test: `admin` / `dev-password-1234`).

## What runs ([dev/compose.yml](../../dev/compose.yml))
| Container | Role |
|---|---|
| ezt-dev-eztraefik | the image under test, with dev defaults: ports 18080 / 18443, network `ezt-dev`, Traefik named `ezt-dev-traefik`, ACME server Pebble |
| ezt-dev-traefik | created by eztraefik during setup (not in the compose file) |
| ezt-dev-pebble | [[00 - Downloaded Docs/Pebble/README|Pebble]], a test ACME CA. `PEBBLE_VA_ALWAYS_VALID=1` skips challenges, so fake domains get certificates (not trusted by browsers) |
| ezt-dev-app-a, app-b | [[00 - Downloaded Docs/whoami/README|whoami]] HTTP backends on the Traefik network |
| ezt-dev-app-c | whoami **not** on the network: eztraefik must connect it |
| ezt-dev-external-api | whoami published on host port 18090: the "IP address" target |
| ezt-dev-tcp-echo, udp-echo | whoamitcp / whoamiudp for custom TCP and UDP ports |
| ezt-dev-npm | profile `npm`: a real Nginx Proxy Manager 2.15.1 on fake ports 28080 / 28443 / 28081 (admin) / 26432 (stream), to import from |

## What the test checks ([dev/test.py](../../dev/test.py))
Setup through the API, custom TCP 15432 and UDP 15353 entrypoints (pending, then applied), apr1 basic auth, refusal of an HTTP-only route on a redirecting entrypoint, eight routes, HTTPS with a Pebble certificate, a container connected on save, the IP target, 401 / 200 with basic auth, load balancing over two servers, HTTP to HTTPS redirect keeping port 18443, plain HTTP, TCP and UDP traffic, relations, certificates, domains, stats, access and Traefik logs, history, overview counts, disabling a route. Requests are sent with the fake host name in SNI and `Host`, like `curl --resolve`.

The test can run again on an environment it already set up: it restores its own preconditions (signs in instead of running setup, re-enables the `web` redirect before checking the refusal).

Last runs (1.0.0+4): **30 of 30** on a fresh environment, **28 of 28** on a repeat run (the two setup checks only apply to a fresh one). The setup wizard was also clicked through in a real browser.

## Import from NPM test
```bash
docker compose -f dev/compose.yml --profile npm up -d --build
python3 dev/test_npm.py      # after dev/test.py has set up eztraefik
```
Seeds the dev NPM (first admin, proxy host with a custom location, protected host with an uploaded wildcard certificate and HSTS, redirection, stream, 404 host), checks NPM serves them, imports, switches the ports to Traefik, checks the same answers, switches back. Repeatable. Last run (1.1.0+5): **26 of 26**; `dev/test.py` still 28 of 28 after it. Details: [[03 - Features/Import from NPM|Import from NPM]].

## Visiting it in a browser
Point the fake names at the host, for example in `/etc/hosts`: `192.168.1.101 a.ezt.test c.ezt.test ext.ezt.test secure.ezt.test pool.ezt.test plain.ezt.test`, then open `https://a.ezt.test:18443` and accept the untrusted certificate.

## Related
- [[08 - Deployment/Configuration|Configuration]]
- [[08 - Deployment/Docker Image|Docker Image]]
- [[04 - Architecture/Dynamic Config|Dynamic Config]]
- [[00 - Downloaded Docs/Pebble/README|README]]
- [[00 - Downloaded Docs/whoami/README|README]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[01 - Vision/Plan|Plan]]
- [[04 - Architecture/Code Map|Code Map]]
- [[Home]]
- [[99 - Changelog/1.0.0+4|1.0.0+4]]
- [[99 - Changelog/1.1.0+5|1.1.0+5]]
