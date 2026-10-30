---
title: Auth
tags: [feature, security]
version: 0.2.0+3
related: ["[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Middlewares|Middlewares]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[02 - Tech/Stack|Stack]]", "[[04 - Architecture/Code Map|Code Map]]"]
---

# Auth

Status: implemented in 0.2.0+3.

- One admin account from onboarding. Password hashed with **PBKDF2-HMAC-SHA256, 600 000 iterations**, 16-byte salt ([HashPassword](../../server/internal/auth/auth.go#L24-L34)). The plan said Argon2id; PBKDF2 is in Go's standard library ([[00 - Downloaded Docs/Go/crypto-pbkdf2|crypto/pbkdf2]]) and keeps the backend free of third-party modules.
- Session cookie `ezt_session`: random 256-bit id, HttpOnly, SameSite=Strict, 7 days, `Secure` when `EZT_SECURE_COOKIES=1`. Sessions live in memory: restarting eztraefik signs everyone out.
- Every non-GET request must carry the header `X-EZT: 1`, which a cross-site form can't set (CSRF guard on top of SameSite).
- Login: 10 failures per 15 minutes per client IP, then refused.
- Password change signs every other session out.
- Traefik's API stays on its internal entrypoint and Docker network, never published (unless the dashboard port is set on purpose).
- To serve eztraefik itself over HTTPS: create a route to the container `eztraefik` port 8080, then stop publishing 8080 ([[08 - Deployment/Install|Install]]).

## Code
- [Sessions](../../server/internal/auth/auth.go#L55-L63), guard [guard](../../server/internal/api/api.go#L133-L149), [login](../../server/internal/api/api.go#L276-L295)
- [Login](../../web/src/pages/Login.tsx#L8-L51)

## Related
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Middlewares|Middlewares]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[02 - Tech/Stack|Stack]]
- [[04 - Architecture/Code Map|Code Map]]
