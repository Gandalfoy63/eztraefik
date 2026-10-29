---
title: Navigation
tags: [ui-ux, navigation]
version: 0.2.0+3
related: ["[[05 - UI-UX/Style|Style]]", "[[05 - UI-UX/Components|Components]]", "[[04 - Architecture/Frontend|Frontend]]", "[[01 - Vision/Plan|Plan]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[04 - Architecture/Code Map|Code Map]]", "[[Home]]"]
---

# Navigation

Implemented in [Shell](../../web/src/app/Shell.tsx#L98-L236), menu in [NAV](../../web/src/app/Shell.tsx#L17-L50).

- Fixed sidebar, grouped and labeled: Overview; Routing (Routes, Services, Middlewares); Network (Domains, Certificates, Entrypoints); Sources (Docker); Observe (Stats, Logs); System (Traefik, Settings).
- Current page: tinted item with a 3px accent bar, `aria-current="page"`, breadcrumb (group / page) in the top bar, page title in the tab.
- Counts on Routes, Services, Middlewares, Certificates and Traefik when something needs attention (red when an error).
- Footer: Traefik version and state, links to the Traefik page.
- Desktop: the toggle collapses to icons with tooltips (remembered per browser). Below 860px: the same toggle opens a drawer with a scrim; Esc, scrim or picking a page closes it.
- Top bar: theme switch (labeled), sign out.
- One place per task: routes are created only in the route window, Traefik is applied only on the Traefik page. Other pages link there, prefilled.
- Unknown hash: a not-found page pointing back to Overview ([NotFound](../../web/src/pages/NotFound.tsx#L5-L13)).

## Related
- [[05 - UI-UX/Style|Style]]
- [[05 - UI-UX/Components|Components]]
- [[04 - Architecture/Frontend|Frontend]]
- [[01 - Vision/Plan|Plan]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[04 - Architecture/Code Map|Code Map]]
- [[Home]]
