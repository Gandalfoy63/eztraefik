---
title: Certificates
tags: [feature, network, tls]
version: 0.2.0+3
related: ["[[03 - Features/Domains|Domains]]", "[[03 - Features/Routes|Routes]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[03 - Features/Overview|Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[04 - Architecture/Dynamic Config|Dynamic Config]]"]
---

# Certificates

Status: implemented in 0.2.0+3.

- **Resolvers**: ACME accounts with HTTP, TLS-ALPN or DNS challenge, email, optional private ACME server URL and its CA certificate (written to the shared volume and trusted through `LEGO_CA_CERTIFICATES`). DNS provider credentials are added as secret env vars. Saving needs Apply on the Traefik page.
- **Certificates**: ACME certificates read from each resolver's storage file ([ACMECerts](../../server/internal/traefik/certs.go#L33-L72)) and uploaded ones, with domains, issuer and expiry (warning at 14 days, error at 3).
- **Upload**: certificate + key PEM (paste or file), checked as a pair before saving ([ValidatePair](../../server/internal/traefik/certs.go#L89-L94)), served through the File provider's `tls.certificates`.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/tls/certificate-resolvers/acme|ACME]], [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/tls/tls-certificates|TLS certificates]].

## Code
- [uploadCert](../../server/internal/api/resources.go#L551-L586), [allCerts](../../server/internal/api/resources.go#L534-L544)
- [Certificates](../../web/src/pages/Certificates.tsx#L15-L217)

## Related
- [[03 - Features/Domains|Domains]]
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[03 - Features/Overview|Overview]]
- [[04 - Architecture/Code Map|Code Map]]
- [[04 - Architecture/Dynamic Config|Dynamic Config]]
