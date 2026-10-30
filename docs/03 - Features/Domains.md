---
title: Domains
tags: [feature, network]
version: 1.5.0+22
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[04 - Architecture/Dynamic Config|Dynamic Config]]", "[[00 - Downloaded Docs/Public Suffix List/README|Public Suffix List]]", "[[99 - Changelog/1.5.0+22|1.5.0+22]]"]
---

# Domains

Status: implemented in 0.2.0+3.

- Domains you add, plus every domain found in route hosts ([Group](../../server/internal/domains/domains.go#L83-L110)):
  - A host under an added domain goes there, the longest one first.
  - Otherwise the [[00 - Downloaded Docs/Public Suffix List/README|Public Suffix List]] decides: `myhome.duckdns.org` is a domain of its own because `duckdns.org` is a shared suffix, like `co.uk`.
  - Then recurrence narrows it: with only `a.home.example.com` and `b.home.example.com`, the domain is `home.example.com`. A host directly on the domain, like `www.example.com`, keeps `example.com`; one deep host alone is no pattern.
  - A domain added by hand stays as added, so an added `duckdns.org` still groups everything under it until it is removed.
- Per host: DNS check (does it resolve, to what) and certificate status (valid / days left). The routes column is gone: the host says it.
- Domain options: default certificate resolver for its routes, and **wildcard**: routes on it then ask for one `*.domain` + `domain` certificate (needs a DNS challenge resolver).
- "Add route on this domain" opens the route window with the domain filled in.

## Code
- [listDomains](../../server/internal/api/resources.go#L413-L454), [checkDNS](../../server/internal/api/resources.go#L513-L523), wildcard rendering [domainFor](../../server/internal/traefik/dynamic.go#L350-L359)
- [Domains](../../web/src/pages/Domains.tsx#L51-L138)

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Certificates|Certificates]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
- [[04 - Architecture/Dynamic Config|Dynamic Config]]
- [[00 - Downloaded Docs/Public Suffix List/README|Public Suffix List]]
- [[99 - Changelog/1.5.0+22|1.5.0+22]]
