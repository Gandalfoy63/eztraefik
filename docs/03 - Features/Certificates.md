---
title: Certificates
tags: [feature, network, tls]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Domains|Domains]]", "[[03 - Features/Routes|Routes]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]"]
---

# Certificates

Status: planned. Not implemented yet.

## Scope
- **Resolvers**: create ACME resolvers (Let's Encrypt prod / staging, other CA via URL), challenge type HTTP-01, TLS-ALPN-01 or DNS-01 with provider picker. DNS credentials become Traefik env vars. Editing a resolver recreates the Traefik container.
- **Issued certificates**: read from the resolver storage (`acme.json`): domains, SANs, issuer, expiry. Warning at 14 days, error at 3.
- **Uploaded certificates**: cert + key PEM, stored as files referenced by the File provider.
- **TLS options**: min / max version, cipher suites, client auth (mTLS), default certificate.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/tls/certificate-resolvers/acme|ACME resolver]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/tls/tls-certificates|TLS certificates]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/tls/tls-options|TLS options]].

## Related
- [[03 - Features/Domains|Domains]]
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
