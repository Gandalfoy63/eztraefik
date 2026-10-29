---
title: Nginx Proxy Manager documentation (downloaded)
tags: [downloaded-docs, migration]
version: 1.1.0+5
related: ["[[03 - Features/Import from NPM|Import from NPM]]", "[[02 - Tech/Stack|Stack]]"]
---

# Nginx Proxy Manager documentation

| Field | Value |
|---|---|
| Source | https://github.com/NginxProxyManager/nginx-proxy-manager/tree/v2.15.1 (`docs/src` and `backend/schema`) |
| Version | 2.15.1 (the version running on this host) |
| Downloaded | 2026-10-29 |
| Format | Docs: original Markdown. API: the OpenAPI schema files eztraefik reads, as JSON in Markdown. |

Used for: reading an NPM configuration through its API to import it ([[03 - Features/Import from NPM|Import from NPM]]).

What the schema does not say, found against a real NPM 2.15.1 and recorded in the feature note:
- Access list items come back with an empty `password`; the hashes are in `/data/access/<id>` inside the NPM container.
- `meta.certificate` and `meta.certificate_key` hold the PEM of uploaded certificates; `/download` only works for Let's Encrypt ones.
- A fresh NPM has no user: `GET /api` says `setup: false` and `POST /api/users` creates the first admin.

## Pages
- [[Overview]]
- [[advanced-config]]
- [[api/404 hosts]]
- [[api/Access lists]]
- [[api/Certificates]]
- [[api/Common definitions]]
- [[api/Proxy hosts]]
- [[api/Redirection hosts]]
- [[api/Sign in (tokens)]]
- [[api/Streams]]
- [[faq]]
- [[guide]]
- [[setup]]
- [[upgrading]]

## Related
- [[03 - Features/Import from NPM|Import from NPM]]
- [[02 - Tech/Stack|Stack]]
