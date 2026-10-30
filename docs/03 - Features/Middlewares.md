---
title: Middlewares
tags: [feature, routing]
version: 0.2.0+3
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Relations|Relations]]", "[[03 - Features/Auth|Auth]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[04 - Architecture/Dynamic Config|Dynamic Config]]", "[[03 - Features/Import from NPM|Import from NPM]]", "[[03 - Features/Route Settings|Route Settings]]"]
---

# Middlewares

Status: implemented in 0.2.0+3.

- Type picker grouped by purpose (Security, Redirects and paths, Headers, Traffic control, Other; TCP: IP allow list, connection limit), one sentence per type.
- Common types have a form: basic auth (users added with username + password, hashed to apr1 by the server, so no plain password is stored), IP allow list, forward auth, redirect to HTTPS, redirect regex, strip / add / replace path, headers (custom request / response headers, HSTS, frame deny, nosniff, CORS origins), rate limit, concurrent requests, retry, circuit breaker, compression, chain.
- Every type can be edited as JSON with Traefik's own keys; types without a form use JSON only.
- Traefik Hub types (API key, JWT, HMAC, OIDC, OPA, WAF, LDAP, OAuth 2, distributed rate limit) are listed as unavailable and refused by the server.
- Table shows type, which routes use it (from Traefik) and its status. Delete is blocked while a route uses it.

Reference: [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/middlewares/overview|HTTP middlewares]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/middlewares/basicauth|BasicAuth]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/tcp/middlewares/overview|TCP middlewares]].

## Code
- [saveMiddleware](../../server/internal/api/resources.go#L282-L358), [htpasswd](../../server/internal/api/resources.go#L384-L399), hashing [APR1](../../server/internal/auth/auth.go#L140-L149) (checked against `openssl passwd -apr1` in [TestAPR1MatchesOpenSSL](../../server/internal/auth/auth_test.go#L6-L16))
- [Middlewares](../../web/src/pages/Middlewares.tsx#L266-L336)

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Relations|Relations]]
- [[03 - Features/Auth|Auth]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
- [[04 - Architecture/Dynamic Config|Dynamic Config]]
- [[03 - Features/Import from NPM|Import from NPM]]
- [[03 - Features/Route Settings|Route Settings]]
