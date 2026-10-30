---
title: Public Suffix List (downloaded)
tags: [downloaded-docs, network]
version: 1.5.0+22
related: ["[[03 - Features/Domains|Domains]]", "[[02 - Tech/Stack|Stack]]", "[[Home]]"]
---

# Public Suffix List

| Field | Value |
|---|---|
| Source | https://publicsuffix.org/list/public_suffix_list.dat |
| Version | 2026-10-28_13-15-55_UTC, commit 9dfbe81931367b3f0af21035c36ae7eeb830dd88 |
| Downloaded | 2026-10-30 |
| Licence | Mozilla Public License 2.0, kept in the file header |

The data itself, not a description of it, is embedded in the server: [public_suffix_list.dat](../../../server/internal/domains/public_suffix_list.dat). Rules used, as the list defines them: the longest match wins, `*` matches one label, `!` marks an exception, and no match means the last label. Update it by downloading the file again.

Used for: telling which domain a host belongs to ([[03 - Features/Domains|Domains]]).

## Related
- [[03 - Features/Domains|Domains]]
- [[02 - Tech/Stack|Stack]]
- [[Home]]
