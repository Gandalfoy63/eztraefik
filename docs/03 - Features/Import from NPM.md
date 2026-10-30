---
title: Import from NPM
tags: [feature, migration]
version: 1.3.0+19
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Entrypoints|Entrypoints]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Features Index|Features Index]]", "[[06 - API/API Overview|API Overview]]", "[[08 - Deployment/Dev Environment|Dev Environment]]", "[[09 - Data/Data Model|Data Model]]", "[[99 - Changelog/1.1.0+5|1.1.0+5]]", "[[00 - Downloaded Docs/Nginx Proxy Manager/README|README]]", "[[04 - Architecture/Code Map|Code Map]]", "[[99 - Changelog/1.2.8+17|1.2.8+17]]", "[[03 - Features/Route Settings|Route Settings]]", "[[99 - Changelog/1.3.0+19|1.3.0+19]]", "[[00 - Downloaded Docs/nginx/README|nginx docs]]"]
---

# Import from NPM

Status: implemented in 1.1.0+5. Page: System > Import from NPM. Moves a [Nginx Proxy Manager](https://nginxproxymanager.com) setup to eztraefik in four steps, without changing NPM. Reference: [[00 - Downloaded Docs/Nginx Proxy Manager/README|NPM docs]].

## 1. Connect
- eztraefik looks for an NPM container on this Docker host ([detectNPM](../../server/internal/api/migrate.go#L51-L82)) and proposes its admin URL as seen from eztraefik's network (the network gateway plus NPM's published admin port).
- You sign in with NPM's email and password, plus the two-factor code if the account uses it ([Login](../../server/internal/npm/client.go#L210-L224), [[00 - Downloaded Docs/Nginx Proxy Manager/api/Sign in (tokens)|NPM sign-in]]). The NPM token lives in memory for one hour and is never saved.
- eztraefik reads proxy hosts, redirections, streams, access lists, certificates and 404 hosts ([Fetch](../../server/internal/npm/client.go#L238-L261)).
- When NPM runs on this host, the access list password hashes are copied from its container (`/data/access/<id>`, through the Docker API, [readHtpasswd](../../server/internal/api/migrate.go#L98-L125)). NPM's API never returns passwords.

## 2. Review
Nothing is saved yet. Each NPM object is one row: what it becomes, or why it is skipped, and a note for every behavior change ([BuildPlan](../../server/internal/npm/convert.go#L149-L543)).

| NPM | eztraefik |
|---|---|
| Proxy host | HTTP route with the same domains, to the container of that name (or IP) on this host, else to the address |
| Custom location | its own route with the same domains and a path prefix; regex locations are skipped |
| SSL with a Let's Encrypt certificate | HTTPS from a resolver; Traefik requests its own certificate after the switch and renews it. When eztraefik has no resolver, a new `letsencrypt` one is created with the email from NPM's certificates or, as recent NPM versions no longer store it there, the NPM account email you signed in with (shown and editable in the review); DNS challenge credentials are converted for Cloudflare, DigitalOcean, Duck DNS, Hetzner and OVH |
| SSL with an uploaded certificate | the certificate and key are copied (they are in NPM's API) and served as an uploaded certificate |
| Force SSL off but a certificate | HTTPS with a redirect from HTTP (noted) |
| HSTS | `headers` middleware `npm-hsts` or `npm-hsts-subdomains` (2 years, preload) |
| Access list | `npm-acl-<name>-ips` (IP allow list) and `npm-acl-<name>-auth` (basic auth with the same hashes, Authorization removed unless "pass auth") |
| Redirection host | route to `noop@internal` with a `redirectRegex` middleware (scheme, domain, path kept or not, 301 / 308 permanent) |
| Stream | entrypoint `npm-tcp-<port>` / `npm-udp-<port>` and a TCP / UDP route; the port is published at the switch |
| 404 host | skipped: Traefik answers 404 for unknown domains anyway |

Items are skipped with a reason when:
- one of their domains is already routed in eztraefik;
- they are protected by an access list whose passwords are unknown (the screen asks for them; a protected site is never imported unprotected);
- they need a Let's Encrypt resolver and no email is known at all (the screen asks for one);
- they are plain HTTP while eztraefik's `web` entrypoint redirects everything (they get HTTPS instead when a resolver exists).

Custom nginx config is read directive by directive: it becomes named settings on the route, or stays as a note, see [[03 - Features/Route Settings|Route Settings]].

Notes, not blockers: custom nginx config that has no conversion, "Block common exploits" and caching (no Traefik Proxy equivalent), deny rules in access lists (Traefik Proxy only allows), "satisfy any" (Traefik requires IP and password), 307 / 308 redirects.

## 3. Import
The selected items are saved in one change (one history entry, so Settings > History can undo it) ([npmImport](../../server/internal/api/migrate.go#L231-L356)). Every route goes through the normal route checks; a failing one is reported and the rest is saved. New entrypoints and the resolver are saved as pending Traefik settings. NPM keeps serving until the switch.

## 4. Switch traffic, and back
Only when NPM runs on this host ([npmSwitch](../../server/internal/api/migrate.go#L370-L437)):
1. Reads the host ports NPM publishes for 80, 443 and each stream port.
2. Stores Traefik's current host ports, sets `web`, `websecure` and the stream entrypoints to NPM's ports.
3. Stops NPM (kept, config unchanged) and recreates Traefik.
4. If Traefik does not start: ports go back, Traefik is recreated on them, NPM is started again.

**Switch back** ([npmSwitchBack](../../server/internal/api/migrate.go#L454-L470)) gives the ports back, recreates Traefik, starts NPM. Imported routes stay, so you can switch again. The record is `migration` in the [[09 - Data/Data Model|Data Model]].

When NPM runs elsewhere, the page explains the manual switch (stop it there, move DNS or port forwarding, set the ports in [[03 - Features/Entrypoints|Entrypoints]]).

## Tested
- Unit: [TestPlanMapsEveryKind](../../server/internal/npm/convert_test.go#L60-L112), [TestProtectedHostNeedsPasswords](../../server/internal/npm/convert_test.go#L114-L124), [TestConflictsAndRedirectingWeb](../../server/internal/npm/convert_test.go#L126-L138).
- End to end: `dev/test_npm.py` against a real NPM 2.15.1 in the [[08 - Deployment/Dev Environment|Dev Environment]]: the same seven requests (proxy, custom location, basic auth 401 and 200, uploaded wildcard certificate, redirection, TCP stream) answer the same through NPM, then through Traefik after the switch, then NPM again after switching back. **26 of 26** pass. Not tested: Let's Encrypt certificate download (not used, see above) and 2FA (code path only).

## Code
- [Client](../../server/internal/npm/client.go#L128-L132), [Item](../../server/internal/npm/convert.go#L15-L32)
- [ImportNPM](../../web/src/pages/ImportNPM.tsx#L58-L347)

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Middlewares|Middlewares]]
- [[03 - Features/Certificates|Certificates]]
- [[03 - Features/Entrypoints|Entrypoints]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Features Index|Features Index]]
- [[06 - API/API Overview|API Overview]]
- [[08 - Deployment/Dev Environment|Dev Environment]]
- [[09 - Data/Data Model|Data Model]]
- [[99 - Changelog/1.1.0+5|1.1.0+5]]
- [[00 - Downloaded Docs/Nginx Proxy Manager/README|README]]
- [[04 - Architecture/Code Map|Code Map]]
- [[99 - Changelog/1.2.8+17|1.2.8+17]]
- [[03 - Features/Route Settings|Route Settings]]
- [[99 - Changelog/1.3.0+19|1.3.0+19]]
- [[00 - Downloaded Docs/nginx/README|nginx docs]]
