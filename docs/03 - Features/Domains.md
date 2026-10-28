---
title: Domains
tags: [feature, network]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]"]
---

# Domains

Status: planned. Not implemented yet.

Domains are an eztraefik concept on top of router rules: every `Host` / `HostSNI` value is grouped under its registrable domain.

## Scope
- List of domains with subdomain count, route count, certificate status and expiry.
- Add a domain: DNS check (A / AAAA points to this host), choose default cert resolver, optional wildcard (needs DNS challenge).
- Domain detail: subdomains, routes on each, "Add route on this domain" (opens the Routes form prefilled).
- Domains found in Docker labels show up automatically.

Reference: [[00 - Downloaded Docs/Traefik/reference/routing-configuration/http/tls/overview|TLS overview]], [[00 - Downloaded Docs/Traefik/https/include-acme-multiple-domains-example|ACME multiple domains]].

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Certificates|Certificates]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
