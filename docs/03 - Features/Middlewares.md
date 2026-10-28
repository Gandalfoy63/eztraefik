---
title: Middlewares
tags: [feature, routing]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Relations|Relations]]", "[[03 - Features/Auth|Auth]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]"]
---

# Middlewares

Status: planned. Not implemented yet.

Create and reuse middlewares. A form per type, plus a YAML preview.

## HTTP (Traefik Proxy)
AddPrefix, BasicAuth, Buffering, Chain, CircuitBreaker, Compress, ContentType, DigestAuth, EncodedCharacters, Errors (error pages), ForwardAuth, GrpcWeb, Headers (including CORS and security headers), InFlightReq, IPAllowList, PassTLSClientCert, RateLimit, RedirectRegex, RedirectScheme, ReplacePath, ReplacePathRegex, Retry, StripPrefix, StripPrefixRegex.

## TCP
InFlightConn, IPAllowList.

## Traefik Hub only
APIKey, JWT, HMAC, OIDC, OPA, WAF, LDAP, OAuth2, distributed RateLimit: listed with a "Needs Traefik Hub" badge and disabled.

## UX
- Picker grouped by purpose: Security, Redirects and paths, Headers, Traffic control, Other.
- Each type shows one sentence of what it does and links to the local doc page.
- "Used by" list on every middleware.

Reference: [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/middlewares/overview|HTTP middlewares]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/tcp/middlewares/overview|TCP middlewares]].

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Relations|Relations]]
- [[03 - Features/Auth|Auth]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
