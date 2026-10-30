---
title: Code Map
tags: [architecture, code-map]
version: 1.4.0+21
related: ["[[04 - Architecture/Overview|Overview]]", "[[Home]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[02 - Tech/Stack|Stack]]", "[[03 - Features/Auth|Auth]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Config History|Config History]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Domains|Domains]]", "[[03 - Features/Entrypoints|Entrypoints]]", "[[03 - Features/Logs|Logs]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Overview|Overview]]", "[[03 - Features/Relations|Relations]]", "[[03 - Features/Routes|Routes]]", "[[03 - Features/Services|Services]]", "[[03 - Features/Stats|Stats]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[04 - Architecture/Code Map|Code Map]]", "[[04 - Architecture/Docker Client|Docker Client]]", "[[04 - Architecture/Dynamic Config|Dynamic Config]]", "[[04 - Architecture/Frontend|Frontend]]", "[[05 - UI-UX/Charts|Charts]]", "[[05 - UI-UX/Components|Components]]", "[[05 - UI-UX/Navigation|Navigation]]", "[[05 - UI-UX/Preview|Preview]]", "[[05 - UI-UX/Style|Style]]", "[[06 - API/API Overview|API Overview]]", "[[08 - Deployment/Configuration|Configuration]]", "[[08 - Deployment/Dev Environment|Dev Environment]]", "[[08 - Deployment/Docker Image|Docker Image]]", "[[08 - Deployment/Install|Install]]", "[[09 - Data/Data Model|Data Model]]", "[[99 - Changelog/Changelog|Changelog]]", "[[00 - Downloaded Docs/Lucide/README|Lucide docs]]", "[[05 - UI-UX/Design Principles|Design Principles]]", "[[99 - Changelog/1.1.0+5|1.1.0+5]]", "[[99 - Changelog/1.1.1+6|1.1.1+6]]", "[[99 - Changelog/1.2.0+8|1.2.0+8]]", "[[99 - Changelog/1.2.1+9|1.2.1+9]]", "[[99 - Changelog/1.2.2+10|1.2.2+10]]", "[[03 - Features/Route Settings|Route Settings]]"]
---

# Code Map

Every source file, what it does, and its note. Third-party files not listed: `preview/vendor/lucide.min.js`, `web/public/fonts/*` (SIL OFL), `web/package-lock.json`.

| File | Purpose | Note |
|---|---|---|
| [VERSION](../../VERSION) | Single source of truth for the version, read by the Go build and publish script | [[99 - Changelog/Changelog|Changelog]] |
| [CLAUDE.md](../../CLAUDE.md) | Project rules | [[Home|Home]] |
| [Dockerfile](../../Dockerfile) | Three-stage image build: web, Go, distroless | [[08 - Deployment/Docker Image|Docker Image]] |
| [deploy/compose.example.yml](../../deploy/compose.example.yml) | Commented example with apps routed from the UI and with labels | [[08 - Deployment/Compose Example|Compose Example]] |
| [deploy/compose.yml](../../deploy/compose.yml) | Production install | [[08 - Deployment/Install|Install]] |
| [dev/compose.yml](../../dev/compose.yml) | Dev environment with fake domains, ports and Pebble | [[08 - Deployment/Dev Environment|Dev Environment]] |
| [dev/test.py](../../dev/test.py) | End-to-end test against the dev environment (30 checks) | [[08 - Deployment/Dev Environment|Dev Environment]] |
| [dev/down.sh](../../dev/down.sh) | Removes the dev environment | [[08 - Deployment/Dev Environment|Dev Environment]] |
| [dev/pebble/pebble.minica.pem](../../dev/pebble/pebble.minica.pem) | Pebble's test CA, trusted by the dev Traefik | [[08 - Deployment/Dev Environment|Dev Environment]] |
| [server/main.go](../../server/main.go) | Entry point: env config, wiring, HTTP server, healthcheck | [[08 - Deployment/Configuration|Configuration]] |
| [server/internal/api/api.go](../../server/internal/api/api.go) | Router, auth guard, errors, Commit (save + write + Traefik check), login | [[06 - API/API Overview|API Overview]] |
| [server/internal/api/routes.go](../../server/internal/api/routes.go) | Routes: list, validate, save, delete, preview | [[03 - Features/Routes|Routes]] |
| [server/internal/api/resources.go](../../server/internal/api/resources.go) | Services, middlewares, domains, certificates | [[03 - Features/Services|Services]] |
| [server/internal/api/system.go](../../server/internal/api/system.go) | Traefik settings, apply, restart; Docker containers and networks | [[03 - Features/Traefik Container|Traefik Container]] |
| [server/internal/api/observe.go](../../server/internal/api/observe.go) | Stats, logs, runtime data, overview | [[03 - Features/Overview|Overview]] |
| [server/internal/api/setup.go](../../server/internal/api/setup.go) | Defaults, onboarding, history, export / import | [[03 - Features/Onboarding|Onboarding]] |
| [server/internal/api/migrate.go](../../server/internal/api/migrate.go) | NPM import: detect, connect, review, import, switch traffic and back | [[03 - Features/Import from NPM|Import from NPM]] |
| [server/internal/npm/client.go](../../server/internal/npm/client.go) | NPM API client (sign-in with 2FA, read config) | [[03 - Features/Import from NPM|Import from NPM]] |
| [server/internal/npm/convert.go](../../server/internal/npm/convert.go) | NPM objects to eztraefik routes, middlewares, ports, certificates | [[03 - Features/Import from NPM|Import from NPM]] |
| [server/internal/npm/convert_test.go](../../server/internal/npm/convert_test.go) | Converter tests on real NPM output shapes | [[03 - Features/Import from NPM|Import from NPM]] |
| [server/internal/npm/nginx.go](../../server/internal/npm/nginx.go) | Custom nginx config parser, to named route settings | [[03 - Features/Route Settings|Route Settings]] |
| [server/internal/npm/nginx_test.go](../../server/internal/npm/nginx_test.go) | Parser tests | [[03 - Features/Route Settings|Route Settings]] |
| [web/src/pages/ImportNPM.tsx](../../web/src/pages/ImportNPM.tsx) | Import from NPM page | [[03 - Features/Import from NPM|Import from NPM]] |
| [dev/test_npm.py](../../dev/test_npm.py) | End-to-end NPM import and switch test (26 checks) | [[08 - Deployment/Dev Environment|Dev Environment]] |
| [server/internal/api/setup_test.go](../../server/internal/api/setup_test.go) | Setup never offers eztraefik itself as a Traefik | [[03 - Features/Onboarding|Onboarding]] |
| [server/internal/api/certs_test.go](../../server/internal/api/certs_test.go) | Deleting a certificate or resolver keeps the routes | [[03 - Features/Certificates|Certificates]] |
| [server/internal/auth/auth.go](../../server/internal/auth/auth.go) | Password hashing, sessions, login limit, apr1 | [[03 - Features/Auth|Auth]] |
| [server/internal/auth/auth_test.go](../../server/internal/auth/auth_test.go) | apr1 against OpenSSL, password round trip | [[03 - Features/Auth|Auth]] |
| [server/internal/docker/docker.go](../../server/internal/docker/docker.go) | Docker Engine API client | [[04 - Architecture/Docker Client|Docker Client]] |
| [server/internal/store/model.go](../../server/internal/store/model.go) | State types | [[09 - Data/Data Model|Data Model]] |
| [server/internal/store/store.go](../../server/internal/store/store.go) | JSON store, atomic writes, history | [[09 - Data/Data Model|Data Model]] |
| [server/internal/traefik/container.go](../../server/internal/traefik/container.go) | Flags, env, container spec, apply with fallback, status | [[03 - Features/Traefik Container|Traefik Container]] |
| [server/internal/traefik/dynamic.go](../../server/internal/traefik/dynamic.go) | State to Traefik dynamic config | [[04 - Architecture/Dynamic Config|Dynamic Config]] |
| [server/internal/traefik/settings.go](../../server/internal/traefik/settings.go) | Route settings to middlewares and a transport | [[03 - Features/Route Settings|Route Settings]] |
| [server/internal/traefik/settings_test.go](../../server/internal/traefik/settings_test.go) | Route settings rendering tests | [[03 - Features/Route Settings|Route Settings]] |
| [server/internal/traefik/yaml.go](../../server/internal/traefik/yaml.go) | YAML writer | [[04 - Architecture/Dynamic Config|Dynamic Config]] |
| [server/internal/traefik/api.go](../../server/internal/traefik/api.go) | Traefik API client (rawdata, version, ping, metrics) | [[03 - Features/Relations|Relations]] |
| [server/internal/traefik/certs.go](../../server/internal/traefik/certs.go) | ACME storage reader, PEM checks, wildcard matching | [[03 - Features/Certificates|Certificates]] |
| [server/internal/traefik/metrics.go](../../server/internal/traefik/metrics.go) | Prometheus parser and per-minute collector | [[03 - Features/Stats|Stats]] |
| [server/internal/traefik/traefik_test.go](../../server/internal/traefik/traefik_test.go) | Rules, rendering, flags, parser, wildcard tests | [[04 - Architecture/Dynamic Config|Dynamic Config]] |
| [server/internal/webui/webui.go](../../server/internal/webui/webui.go) | Serves the embedded UI with cache headers | [[04 - Architecture/Frontend|Frontend]] |
| [web/index.html](../../web/index.html) | HTML shell, theme before first paint | [[04 - Architecture/Frontend|Frontend]] |
| [web/vite.config.ts](../../web/vite.config.ts) | Vite build and dev proxy | [[04 - Architecture/Frontend|Frontend]] |
| [web/package.json](../../web/package.json) | Pinned web dependencies and scripts | [[02 - Tech/Stack|Stack]] |
| [web/src/main.tsx](../../web/src/main.tsx) | React entry | [[04 - Architecture/Frontend|Frontend]] |
| [web/src/api.ts](../../web/src/api.ts) | API client and types | [[06 - API/API Overview|API Overview]] |
| [web/src/styles.css](../../web/src/styles.css) | Design tokens and base components (from the preview) | [[05 - UI-UX/Style|Style]] |
| [web/src/app.css](../../web/src/app.css) | App components on the same tokens | [[05 - UI-UX/Style|Style]] |
| [web/src/fonts.css](../../web/src/fonts.css) | Self-hosted Fira fonts | [[05 - UI-UX/Style|Style]] |
| [web/src/app/App.tsx](../../web/src/app/App.tsx) | Setup / sign-in / app gate, page table | [[04 - Architecture/Frontend|Frontend]] |
| [web/src/app/Shell.tsx](../../web/src/app/Shell.tsx) | Sidebar, top bar, page transition | [[05 - UI-UX/Navigation|Navigation]] |
| [web/src/app/router.ts](../../web/src/app/router.ts) | Hash router | [[04 - Architecture/Frontend|Frontend]] |
| [web/src/app/Tooltip.tsx](../../web/src/app/Tooltip.tsx) | Global tooltip | [[05 - UI-UX/Components|Components]] |
| [web/src/ui/controls.tsx](../../web/src/ui/controls.tsx) | Field, Switch, StepSlider, Segmented, TagInput, Combobox, CheckChips | [[05 - UI-UX/Components|Components]] |
| [web/src/ui/dnsProviders.ts](../../web/src/ui/dnsProviders.ts) | Generated DNS provider list | [[03 - Features/Certificates|Certificates]] |
| [web/src/ui/feedback.tsx](../../web/src/ui/feedback.tsx) | Button, toasts, badges, empty / error / loading | [[05 - UI-UX/Components|Components]] |
| [web/src/ui/Modal.tsx](../../web/src/ui/Modal.tsx) | Window, tabs, confirm dialog | [[05 - UI-UX/Components|Components]] |
| [web/src/ui/Page.tsx](../../web/src/ui/Page.tsx) | Page header, card, code block | [[05 - UI-UX/Components|Components]] |
| [web/src/ui/LineChart.tsx](../../web/src/ui/LineChart.tsx) | Line chart and sparkline | [[05 - UI-UX/Charts|Charts]] |
| [web/src/ui/hooks.ts](../../web/src/ui/hooks.ts) | useLoad, time formatting | [[05 - UI-UX/Components|Components]] |
| [web/src/ui/Brand.tsx](../../web/src/ui/Brand.tsx) | The logo in the app: icon, theme-aware lockup, name | [[05 - UI-UX/Logo|Logo]] |
| [web/src/ui/certs.ts](../../web/src/ui/certs.ts) | Certificate name matching | [[03 - Features/Certificates|Certificates]] |
| [web/src/pages/Onboarding.tsx](../../web/src/pages/Onboarding.tsx) | Setup wizard | [[03 - Features/Onboarding|Onboarding]] |
| [web/src/pages/Login.tsx](../../web/src/pages/Login.tsx) | Sign in | [[03 - Features/Auth|Auth]] |
| [web/src/pages/Overview.tsx](../../web/src/pages/Overview.tsx) | Overview | [[03 - Features/Overview|Overview]] |
| [web/src/pages/Relations.tsx](../../web/src/pages/Relations.tsx) | Traffic path strips | [[03 - Features/Relations|Relations]] |
| [web/src/pages/Routes.tsx](../../web/src/pages/Routes.tsx) | Routes page | [[03 - Features/Routes|Routes]] |
| [web/src/pages/RouteModal.tsx](../../web/src/pages/RouteModal.tsx) | New / edit route window | [[03 - Features/Routes|Routes]] |
| [web/src/pages/RouteSettings.tsx](../../web/src/pages/RouteSettings.tsx) | Route Settings section of the route window | [[03 - Features/Route Settings|Route Settings]] |
| [web/src/pages/Services.tsx](../../web/src/pages/Services.tsx) | Services page and window | [[03 - Features/Services|Services]] |
| [web/src/pages/Middlewares.tsx](../../web/src/pages/Middlewares.tsx) | Middlewares page, type forms | [[03 - Features/Middlewares|Middlewares]] |
| [web/src/pages/Domains.tsx](../../web/src/pages/Domains.tsx) | Domains page | [[03 - Features/Domains|Domains]] |
| [web/src/pages/Certificates.tsx](../../web/src/pages/Certificates.tsx) | Resolvers, certificates, upload | [[03 - Features/Certificates|Certificates]] |
| [web/src/pages/Entrypoints.tsx](../../web/src/pages/Entrypoints.tsx) | Entrypoints page | [[03 - Features/Entrypoints|Entrypoints]] |
| [web/src/pages/Docker.tsx](../../web/src/pages/Docker.tsx) | Docker page | [[03 - Features/Docker|Docker]] |
| [web/src/pages/Stats.tsx](../../web/src/pages/Stats.tsx) | Stats page | [[03 - Features/Stats|Stats]] |
| [web/src/pages/Logs.tsx](../../web/src/pages/Logs.tsx) | Logs page | [[03 - Features/Logs|Logs]] |
| [web/src/pages/Traefik.tsx](../../web/src/pages/Traefik.tsx) | Traefik container page | [[03 - Features/Traefik Container|Traefik Container]] |
| [web/src/pages/traefikConfig.tsx](../../web/src/pages/traefikConfig.tsx) | Traefik config hook, pending banner | [[03 - Features/Traefik Container|Traefik Container]] |
| [web/src/pages/Settings.tsx](../../web/src/pages/Settings.tsx) | History, account, backup | [[03 - Features/Config History|Config History]] |
| [web/src/pages/NotFound.tsx](../../web/src/pages/NotFound.tsx) | Unknown page | [[05 - UI-UX/Navigation|Navigation]] |
| [marketing/dockerhub/publish.py](../../marketing/dockerhub/publish.py) | Sets the Docker Hub description and overview | [[08 - Deployment/Docker Hub Page|Docker Hub Page]] |
| [marketing/logo/build/build.sh](../../marketing/logo/build/build.sh) | Rebuilds every final logo file | [[05 - UI-UX/Logo|Logo]] |
| [marketing/logo/build/make_svgs.py](../../marketing/logo/build/make_svgs.py) | Logo geometry, colours, animation; writes every SVG | [[05 - UI-UX/Logo|Logo]] |
| [marketing/logo/build/measure.js](../../marketing/logo/build/measure.js) | Wordmark letter positions from Chromium | [[05 - UI-UX/Logo|Logo]] |
| [marketing/logo/build/outline.py](../../marketing/logo/build/outline.py) | Wordmark as glyph outlines (fontTools) | [[05 - UI-UX/Logo|Logo]] |
| [marketing/logo/build/render.js](../../marketing/logo/build/render.js) | PNGs at every size and GIF frames | [[05 - UI-UX/Logo|Logo]] |
| [marketing/logo/build/make_gifs.sh](../../marketing/logo/build/make_gifs.sh) | GIF encoding with ffmpeg | [[05 - UI-UX/Logo|Logo]] |
| [marketing/logo/build/make_web.py](../../marketing/logo/build/make_web.py) | favicon.ico, platform icons, manifest | [[05 - UI-UX/Logo|Logo]] |
| [marketing/logo/build/make_preview.py](../../marketing/logo/build/make_preview.py) | final/preview.html | [[05 - UI-UX/Logo|Logo]] |
| [preview/index.html](../../preview/index.html) | Approved style preview (static, not the app) | [[05 - UI-UX/Preview|Preview]] |
| [preview/styles.css](../../preview/styles.css) | Preview styles, origin of the app tokens | [[05 - UI-UX/Preview|Preview]] |
| [preview/app.js](../../preview/app.js) | Preview behaviour | [[05 - UI-UX/Preview|Preview]] |
| [tools/check_docs.py](../../tools/check_docs.py) | Vault check: links, backlinks, orphans, emoji, code Docs comments | [[04 - Architecture/Code Map|Code Map]] |
| [tools/relink.py](../../tools/relink.py) | Re-points code line links to where symbols are now | [[04 - Architecture/Code Map|Code Map]] |
| [tools/publish.sh](../../tools/publish.sh) | Multi-arch build and push | [[08 - Deployment/Docker Image|Docker Image]] |
| [tools/gen_dns_providers.py](../../tools/gen_dns_providers.py) | Builds the DNS provider list from lego | [[03 - Features/Certificates|Certificates]] |

Keep line links right with `python3 tools/relink.py`; check the vault with `python3 tools/check_docs.py`.

## Related
- [[04 - Architecture/Overview|Overview]]
- [[Home]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[02 - Tech/Stack|Stack]]
- [[03 - Features/Auth|Auth]]
- [[03 - Features/Certificates|Certificates]]
- [[03 - Features/Config History|Config History]]
- [[03 - Features/Docker|Docker]]
- [[03 - Features/Domains|Domains]]
- [[03 - Features/Entrypoints|Entrypoints]]
- [[03 - Features/Logs|Logs]]
- [[03 - Features/Middlewares|Middlewares]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Overview|Overview]]
- [[03 - Features/Relations|Relations]]
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Services|Services]]
- [[03 - Features/Stats|Stats]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[04 - Architecture/Code Map|Code Map]]
- [[04 - Architecture/Docker Client|Docker Client]]
- [[04 - Architecture/Dynamic Config|Dynamic Config]]
- [[04 - Architecture/Frontend|Frontend]]
- [[05 - UI-UX/Charts|Charts]]
- [[05 - UI-UX/Components|Components]]
- [[05 - UI-UX/Navigation|Navigation]]
- [[05 - UI-UX/Preview|Preview]]
- [[05 - UI-UX/Style|Style]]
- [[06 - API/API Overview|API Overview]]
- [[08 - Deployment/Configuration|Configuration]]
- [[08 - Deployment/Dev Environment|Dev Environment]]
- [[08 - Deployment/Docker Image|Docker Image]]
- [[08 - Deployment/Install|Install]]
- [[09 - Data/Data Model|Data Model]]
- [[99 - Changelog/Changelog|Changelog]]
- [[00 - Downloaded Docs/Lucide/README|Lucide docs]]
- [[05 - UI-UX/Design Principles|Design Principles]]
- [[99 - Changelog/1.1.0+5|1.1.0+5]]
- [[99 - Changelog/1.1.1+6|1.1.1+6]]
- [[99 - Changelog/1.2.0+8|1.2.0+8]]
- [[99 - Changelog/1.2.1+9|1.2.1+9]]
- [[99 - Changelog/1.2.2+10|1.2.2+10]]
- [[03 - Features/Route Settings|Route Settings]]
