---
title: Code Map
tags: [architecture, code-map]
version: 0.1.0+1
related: ["[[04 - Architecture/Overview|Architecture Overview]]", "[[05 - UI-UX/Preview|Preview]]", "[[Home]]"]
---

# Code Map

Every source file, what it does, and its doc note.

| File | Purpose | Doc |
|---|---|---|
| [VERSION](../../VERSION) | Single source of truth for the version | [[99 - Changelog/Changelog|Changelog]] |
| [CLAUDE.md](../../CLAUDE.md) | Project rules for every change | [[Home]] |
| [preview/index.html](../../preview/index.html) | Style preview markup | [[05 - UI-UX/Preview|Preview]] |
| [preview/styles.css](../../preview/styles.css) | Style preview tokens and components | [[05 - UI-UX/Design Principles|Design Principles]] |
| [preview/app.js](../../preview/app.js) | Style preview behaviour (nav, drawer, onboarding) | [[05 - UI-UX/Preview|Preview]] |
| [tools/check_docs.py](../../tools/check_docs.py) | Checks the vault: broken links, missing backlinks, orphans, emoji, frontmatter | [[04 - Architecture/Code Map|Code Map]] |
| preview/vendor/lucide.min.js | Lucide 1.56.0, third party, not edited | [[00 - Downloaded Docs/Lucide/README|Lucide docs]] |

## Related
- [[04 - Architecture/Overview|Architecture Overview]]
- [[05 - UI-UX/Preview|Preview]]
- [[99 - Changelog/Changelog|Changelog]]
- [[Home]]
