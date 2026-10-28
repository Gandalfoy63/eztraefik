---
title: Routes
tags: [feature, routing]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Services|Services]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Domains|Domains]]", "[[03 - Features/Entrypoints|Entrypoints]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Relations|Relations]]", "[[03 - Features/Config History|Config History]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[05 - UI-UX/Preview|Preview]]"]
---

# Routes

Status: planned. Not implemented yet.

Every router, HTTP, TCP and UDP, in one table with a protocol filter.

## Table
Name, protocol, rule (in Fira Code), entrypoints, service, TLS, status (enabled / warning / error from `/api/rawdata`), source (eztraefik, Docker labels, file).

## Create / edit form
- **Protocol**: HTTP, TCP, UDP.
- **Rule builder** (HTTP): Host, HostRegexp, Path, PathPrefix, PathRegexp, Method, Header, HeaderRegexp, Query, QueryRegexp, ClientIP, combined with AND / OR / NOT. Raw rule editor as fallback. See [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/routing/rules-and-priority|HTTP rules and priority]].
- **Rule builder** (TCP): HostSNI, HostSNIRegexp, ClientIP, ALPN. See [[00 - Downloaded Docs/Traefik/reference/routing-configuration/tcp/routing/rules-and-priority|TCP rules]]. UDP has no rule, only entrypoints: [[00 - Downloaded Docs/Traefik/reference/routing-configuration/udp/routing/router|UDP router]].
- **Entrypoints**: pick one or more, including custom ports.
- **TLS**: off, on with a cert resolver, on with uploaded cert, TLS options, passthrough (TCP).
- **Middlewares**: ordered list, drag or arrow buttons to reorder.
- **Service**: pick existing or create inline.
- **Priority**: auto by default, manual in Advanced.
- **Preview**: generated YAML, read-only.

Reference: [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/routing/router|HTTP router]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/tcp/routing/router|TCP router]].

## Related
- [[03 - Features/Services|Services]]
- [[03 - Features/Middlewares|Middlewares]]
- [[03 - Features/Domains|Domains]]
- [[03 - Features/Entrypoints|Entrypoints]]
- [[03 - Features/Certificates|Certificates]]
- [[03 - Features/Relations|Relations]]
- [[03 - Features/Config History|Config History]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[05 - UI-UX/Preview|Preview]]
