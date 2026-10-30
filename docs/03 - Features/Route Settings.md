---
title: Route Settings
tags: [feature, routing, migration]
version: 1.3.0+19
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Import from NPM|Import from NPM]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Features Index|Features Index]]", "[[04 - Architecture/Dynamic Config|Dynamic Config]]", "[[04 - Architecture/Code Map|Code Map]]", "[[05 - UI-UX/Components|Components]]", "[[09 - Data/Data Model|Data Model]]", "[[00 - Downloaded Docs/nginx/README|nginx docs]]", "[[99 - Changelog/1.3.0+19|1.3.0+19]]"]
---

# Route Settings

Status: implemented in 1.3.0+19. Named options on an HTTP route, in the route window under **Route Settings**. They replace what NPM users write as custom nginx config: no Traefik keys, every option has a written-out label. Values appear in "Generated config" in the same window.

Decision: "a slider with named settings" was read as a section of named settings, with real sliders for the numeric ones (a number box beside each takes any exact value). Labels use Title Case, as asked.

## Settings and what they generate

| Setting | Traefik | nginx directive read at import |
|---|---|---|
| Max Upload Size | [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/middlewares/buffering|buffering]] `maxRequestBodyBytes` | `client_max_body_size` |
| Allowed IP Addresses | [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/middlewares/ipallowlist|ipAllowList]] | `allow` ... `deny all` |
| Connect Timeout | [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/load-balancing/serverstransport|serversTransport]] `dialTimeout` | `proxy_connect_timeout` |
| Response Timeout | serversTransport `responseHeaderTimeout` | `proxy_read_timeout` (approximate, see below) |
| Send Public Domain To App | service `passHostHeader` | `proxy_set_header Host $proxy_host` turns it off |
| Skip App Certificate Check | serversTransport `insecureSkipVerify` | `proxy_ssl_verify off` |
| Compress Responses | [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/middlewares/compress|compress]] | `gzip on` |
| Block Embedding In Frames | [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/middlewares/headers|headers]] `frameDeny` | `add_header X-Frame-Options DENY` |
| Block Content Type Sniffing | headers `contentTypeNosniff` | `add_header X-Content-Type-Options nosniff` |
| Headers Sent To The App | headers `customRequestHeaders` | `proxy_set_header` with a fixed value |
| Headers Sent To The Visitor | headers `customResponseHeaders` | `add_header`, `proxy_hide_header` |
| Rewrite Path | [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/middlewares/replacepathregex|replacePathRegex]] | `rewrite` without a redirect |
| Redirect Visitors, Permanent Redirect | [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/middlewares/redirectregex|redirectRegex]] | `rewrite` to an absolute URL, `return 301` |

Each route gets its own middlewares (`ezt-<route>-limit`, `-headers`...) and transport (`ezt-<route>`), so they never show up on the Middlewares page and can't be shared by accident ([routeMiddlewares](../../server/internal/traefik/settings.go#L13-L56), [routeTransport](../../server/internal/traefik/settings.go#L59-L86)). Access and redirects run before the middlewares picked by hand, the rest after. The server checks values in [validateSettings](../../server/internal/api/routes.go#L257-L308). Connection settings are dropped on routes to a shared service, which has its own.

## Reading custom nginx config
[ParseNginx](../../server/internal/npm/nginx.go#L176-L269) reads the custom config of proxy hosts, custom locations and redirections. Every directive ends in one of three places, shown on the import review:
- **Converted** to a named setting (green check).
- **No setting needed**: Traefik already does this, for example `proxy_http_version`, `proxy_buffering off`, WebSocket headers, `Host $host`.
- **Not converted**: kept as a warning, as written.

Rules that keep behavior honest:
- Blocks (`location`, `if`) are never entered: what is inside applies under a condition, and reading it as host-wide would change behavior.
- `allow` / `deny` convert only as allows ending in `deny all`. Traefik Proxy has no deny list, and nginx stops at the first match.
- Patterns must be valid Go regular expressions; lookaheads and other PCRE-only syntax stay unconverted.
- Values with nginx variables Traefik doesn't have (`$request_id`) stay unconverted.
- Only one rewrite and one redirect convert per route; further ones stay as warnings.
- A custom location inherits its host's settings, as in nginx.

Approximation: `proxy_read_timeout` limits each read in nginx; `responseHeaderTimeout` only limits the wait for the start of the answer. `proxy_send_timeout` has no equivalent and Traefik sets no such limit by default, so it needs no setting.

Still without an equivalent: "Block common exploits" and "Cache assets" are NPM switches, not custom config, and stay as notes.

Reference: [[00 - Downloaded Docs/nginx/README|nginx docs]].

## Tested
- Unit tests: [nginx_test.go](../../server/internal/npm/nginx_test.go), [settings_test.go](../../server/internal/traefik/settings_test.go).
- Against a real Traefik v3.7.16 with whoami in throwaway containers, from config produced by the parser: path rewrite, request and response headers, 500 KB accepted and 2 MB refused with 413 under a 1 MB limit, gzip, Host replaced, 403 outside the allow list, 301 keeping host, path and query.
- The window in a browser against a mocked API, at 1280 and 360 px.
- Not run: `dev/test.py` and `dev/test_npm.py`, the dev environment is stopped on request.

## Code
- Parser: [nginx.go](../../server/internal/npm/nginx.go). Model: [RouteSettings](../../server/internal/store/model.go#L112-L129).
- Window: [RouteSettingsPanel](../../web/src/pages/RouteSettings.tsx#L24-L83), [StepSlider](../../web/src/ui/controls.tsx#L56-L58).

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Import from NPM|Import from NPM]]
- [[03 - Features/Middlewares|Middlewares]]
- [[03 - Features/Features Index|Features Index]]
- [[04 - Architecture/Dynamic Config|Dynamic Config]]
- [[04 - Architecture/Code Map|Code Map]]
- [[05 - UI-UX/Components|Components]]
- [[09 - Data/Data Model|Data Model]]
- [[00 - Downloaded Docs/nginx/README|nginx docs]]
- [[99 - Changelog/1.3.0+19|1.3.0+19]]
