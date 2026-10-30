---
title: Dynamic Config
tags: [architecture, traefik]
version: 1.3.0+19
related: ["[[04 - Architecture/Overview|Overview]]", "[[03 - Features/Routes|Routes]]", "[[03 - Features/Services|Services]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Domains|Domains]]", "[[03 - Features/Certificates|Certificates]]", "[[04 - Architecture/Code Map|Code Map]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[Home]]", "[[03 - Features/Route Settings|Route Settings]]", "[[99 - Changelog/1.3.0+19|1.3.0+19]]"]
---

# Dynamic Config

How the state becomes `ezt.yml`, the file Traefik's File provider reads ([[00 - Downloaded Docs/Traefik/reference/install-configuration/providers/others/file|File provider]]).

[Render](../../server/internal/traefik/dynamic.go#L99-L229) builds a map; [ToYAML](../../server/internal/traefik/yaml.go#L15-L19) writes it as block YAML with sorted keys (stable diffs) and every string quoted (rules contain backticks and colons).

| State | Traefik objects |
|---|---|
| Route, HTTP | `http.routers.<name>`; when the target is a container or IP, also `http.services.<name>` with one server |
| Route with HTTPS + redirect | an extra router `<name>-redirect` on the `web` entrypoint with middleware `ezt-redirect-https` (redirectScheme, keeps a non-443 published port) |
| Route TLS | resolver: `tls.certResolver`; wildcard domain: plus `tls.domains: [*.domain, domain]`; existing ACME certificate: resolver + `domains.main`; uploaded certificate: `tls: {}`; TCP passthrough: `tls.passthrough` |
| Route, TCP / UDP | `tcp.routers` with `HostSNI` rules, `udp.routers` (no rule) and their services with `address` servers |
| Shared service | load balancer, weighted, failover, mirroring ([renderService](../../server/internal/traefik/dynamic.go#L265-L319)) |
| Middleware | `http.middlewares.<name>.<type>` or `tcp.middlewares`, config passed through |
| Uploaded certificates | `tls.certificates` with paths in `/etc/eztraefik/certs/` |
| Always | `tls.options.default.minVersion: VersionTLS12` |

Rules: [Rule](../../server/internal/traefik/dynamic.go#L18-L53). Disabled routes are left out. Names starting with `ezt-` are reserved for eztraefik's own objects.

Tested in [TestRenderRedirectKeepsPublishedPort](../../server/internal/traefik/traefik_test.go#L28-L43) and end to end by `dev/test.py` ([[08 - Deployment/Dev Environment|Dev Environment]]).

## Route settings
A route's named settings add middlewares and a transport of its own under the reserved `ezt-` prefix: [[03 - Features/Route Settings|Route Settings]].

## Related
- [[04 - Architecture/Overview|Overview]]
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Services|Services]]
- [[03 - Features/Middlewares|Middlewares]]
- [[03 - Features/Domains|Domains]]
- [[03 - Features/Certificates|Certificates]]
- [[04 - Architecture/Code Map|Code Map]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[Home]]
- [[03 - Features/Route Settings|Route Settings]]
- [[99 - Changelog/1.3.0+19|1.3.0+19]]
