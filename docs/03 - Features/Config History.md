---
title: Config History
tags: [feature, core]
version: 0.2.0+3
related: ["[[03 - Features/Routes|Routes]]", "[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[06 - API/API Overview|API Overview]]", "[[04 - Architecture/Code Map|Code Map]]", "[[04 - Architecture/Overview|Architecture Overview]]", "[[09 - Data/Data Model|Data Model]]"]
---

# Config History

Status: implemented in 0.2.0+3.

- Every change is a snapshot in `/data/history/` with time, user and a message ([Update](../../server/internal/store/store.go#L81-L95)); the last 200 are kept. The admin password hash is never part of a snapshot.
- Settings > History: list, view the dynamic config a version produced, restore. A restore is itself a new entry, so it can be undone. It keeps the account; restored Traefik settings show as pending until applied.
- Settings > Backup: export everything except the account as JSON (includes secret env values), import with confirmation.
- Settings also shows the current generated `ezt.yml`.
- After every save, eztraefik waits for Traefik to reload and returns Traefik's errors on its own objects, shown as a warning toast ([traefikErrors](../../server/internal/api/api.go#L226-L258)).

## Code
- [rollback](../../server/internal/api/setup.go#L205-L223), [importState](../../server/internal/api/setup.go#L239-L272)
- [SettingsPage](../../web/src/pages/Settings.tsx#L153-L171)

## Related
- [[03 - Features/Routes|Routes]]
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[06 - API/API Overview|API Overview]]
- [[04 - Architecture/Code Map|Code Map]]
- [[04 - Architecture/Overview|Architecture Overview]]
- [[09 - Data/Data Model|Data Model]]
