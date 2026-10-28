---
title: Config History
tags: [feature, core]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[04 - Architecture/Overview|Architecture Overview]]"]
---

# Config History

Status: planned. Not implemented yet.

## Scope
- Every save writes a snapshot of the dynamic files and the static settings to SQLite with author and time.
- History page: list, diff between any two, rollback.
- Import / export: the whole config as one archive.
- Before writing, eztraefik validates the YAML; after writing, it checks `/api/rawdata` for new errors and offers to roll back.

Reference: [[00 - Downloaded Docs/Traefik/reference/install-configuration/providers/others/file|File provider]].

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[04 - Architecture/Overview|Architecture Overview]]
