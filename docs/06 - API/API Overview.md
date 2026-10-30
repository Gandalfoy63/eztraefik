---
title: API Overview
tags: [api]
version: 1.1.0+5
related: ["[[04 - Architecture/Overview|Overview]]", "[[01 - Vision/Plan|Plan]]", "[[03 - Features/Auth|Auth]]", "[[04 - Architecture/Frontend|Frontend]]", "[[03 - Features/Features Index|Features Index]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[03 - Features/Routes|Routes]]", "[[03 - Features/Services|Services]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Domains|Domains]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Stats|Stats]]", "[[03 - Features/Logs|Logs]]", "[[03 - Features/Config History|Config History]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Overview|Overview]]", "[[03 - Features/Relations|Relations]]", "[[03 - Features/Entrypoints|Entrypoints]]", "[[04 - Architecture/Code Map|Code Map]]", "[[99 - Changelog/0.1.0+1|0.1.0+1]]", "[[Home]]", "[[03 - Features/Import from NPM|Import from NPM]]", "[[99 - Changelog/1.1.0+5|1.1.0+5]]"]
---

# API Overview

Status: implemented in 0.2.0+3. JSON over `/api/v1`, used by the web UI. Routes are registered in [Handler](../../server/internal/api/api.go#L57-L129).

## Conventions
- Sign-in with the `ezt_session` cookie. Every non-GET request needs the header `X-EZT: 1` ([guard](../../server/internal/api/api.go#L133-L149)).
- Errors: `{"error": "message"}` with a fitting status. Validation errors are `422` with `{"error", "field"}` so the UI puts the message under the field ([FieldError](../../server/internal/api/api.go#L168-L171)).
- Saves that change the dynamic config return `warnings`: errors Traefik reported on eztraefik's objects after reloading.
- This is not Traefik's own API ([[00 - Downloaded Docs/Traefik/reference/install-configuration/api-dashboard|Traefik API]]); eztraefik only reads that one, internally.

## Endpoints
| Method | Path | What | Sign-in |
|---|---|---|---|
| GET | `/meta` | version, onboarded, signed in, dev mode | no |
| POST | `/auth/login, /auth/logout` | session cookie | no |
| GET | `/onboarding/check` | Docker, existing Traefik, used ports, defaults (only before setup) | no |
| POST | `/onboarding/complete` | save setup, create admin, start Traefik (only once) | no |
| GET | `/overview` | counts, attention, recent changes, traffic | yes |
| GET | `/runtime` | Traefik /api/rawdata | yes |
| GET POST | `/routes` | list (managed + runtime + other providers) / create | yes |
| PUT DELETE | `/routes/{id}` | update / delete | yes |
| POST | `/routes/preview` | YAML for a draft route | yes |
| GET POST PUT DELETE | `/services, /services/{id}` | shared services and runtime health | yes |
| GET POST PUT DELETE | `/middlewares, /middlewares/{id}` | middlewares, runtime, allowed types | yes |
| POST | `/tools/htpasswd` | apr1 hash for basic auth | yes |
| GET POST DELETE | `/domains, /domains/{name}` | domains with hosts and routes | yes |
| GET | `/domains/{name}/dns` | DNS lookup | yes |
| GET POST DELETE | `/certificates, /certificates/{id}` | resolvers, issued and uploaded certificates | yes |
| GET PUT | `/traefik` | install config (secrets masked), status, pending diff | yes |
| POST | `/traefik/apply, /traefik/restart` | recreate / restart the container | yes |
| GET POST | `/docker/containers, /docker/containers/{id}/connect` | containers, join the Traefik network | yes |
| GET | `/docker/networks` | networks | yes |
| GET | `/stats?key=&range=` | time series (15m, 1h, 24h, 7d) | yes |
| GET | `/logs/traefik?tail=, /logs/access?limit=&q=&status=` | logs | yes |
| GET POST | `/history, /history/{id}, /history/{id}/rollback` | history and restore | yes |
| GET | `/config/dynamic` | current ezt.yml | yes |
| GET POST | `/export, /import` | backup | yes |
| PUT | `/account/password` | change password | yes |
| GET | `/migrate/npm` | detected NPM containers, import record, open review | yes |
| POST | `/migrate/npm/connect` | sign in to NPM (2FA), read its config, return the review | yes |
| POST | `/migrate/npm/plan` | review again with typed passwords / email | yes |
| DELETE | `/migrate/npm/session` | forget what was read | yes |
| POST | `/migrate/npm/import` | import the selected items | yes |
| POST | `/migrate/npm/switch`, `/migrate/npm/switch-back` | move NPM's ports to Traefik, and back | yes |

## Related
- [[04 - Architecture/Overview|Overview]]
- [[01 - Vision/Plan|Plan]]
- [[03 - Features/Auth|Auth]]
- [[04 - Architecture/Frontend|Frontend]]
- [[03 - Features/Features Index|Features Index]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Services|Services]]
- [[03 - Features/Middlewares|Middlewares]]
- [[03 - Features/Domains|Domains]]
- [[03 - Features/Certificates|Certificates]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Docker|Docker]]
- [[03 - Features/Stats|Stats]]
- [[03 - Features/Logs|Logs]]
- [[03 - Features/Config History|Config History]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Overview|Overview]]
- [[03 - Features/Relations|Relations]]
- [[03 - Features/Entrypoints|Entrypoints]]
- [[04 - Architecture/Code Map|Code Map]]
- [[99 - Changelog/0.1.0+1|0.1.0+1]]
- [[Home]]
- [[03 - Features/Import from NPM|Import from NPM]]
- [[99 - Changelog/1.1.0+5|1.1.0+5]]
