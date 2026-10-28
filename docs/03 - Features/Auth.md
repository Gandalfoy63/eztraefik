---
title: Auth
tags: [feature, security]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]"]
---

# Auth

Status: planned. Not implemented yet.

## Scope for 1.0.0
- One admin account created in onboarding. Password hashed with Argon2id.
- Session cookie: HttpOnly, Secure, SameSite=Strict. CSRF token on mutations.
- Login rate limit.
- eztraefik's own UI is served through Traefik on a domain of the user's choice with HTTPS.
- The Traefik API / dashboard is never exposed publicly; eztraefik talks to it on the internal network.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/api-dashboard|API and dashboard security]].

## Related
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Middlewares|Middlewares]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
