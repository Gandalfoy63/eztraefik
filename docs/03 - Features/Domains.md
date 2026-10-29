---
title: Domains
tags: [feature, network]
version: 0.2.0+3
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[04 - Architecture/Dynamic Config|Dynamic Config]]"]
---

# Domains

Status: implemented in 0.2.0+3.

- Domains you add, plus every domain found in route hosts (grouped by the last two labels, or by an added domain when the host is under it). Without a public suffix list, `example.co.uk` style names group one level too high; add the domain explicitly to fix the grouping.
- Per host: DNS check (does it resolve, to what), certificate status (valid / days left), routes using it.
- Domain options: default certificate resolver for its routes, and **wildcard**: routes on it then ask for one `*.domain` + `domain` certificate (needs a DNS challenge resolver).
- "Add route on this domain" opens the route window with the domain filled in.

## Code
- [listDomains](../../server/internal/api/resources.go#L422-L461), [checkDNS](../../server/internal/api/resources.go#L520-L530), wildcard rendering [domainFor](../../server/internal/traefik/dynamic.go#L343-L352)
- [Domains](../../web/src/pages/Domains.tsx#L24-L129)

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
