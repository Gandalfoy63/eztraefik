---
title: Design Principles
tags: [ui-ux, design-system]
version: 0.2.0+3
related: ["[[05 - UI-UX/Preview|Preview]]", "[[01 - Vision/Plan|Plan]]", "[[01 - Vision/Vision|Vision]]", "[[00 - Downloaded Docs/Lucide/README|Lucide docs]]", "[[00 - Downloaded Docs/Google Fonts/README|Google Fonts docs]]", "[[04 - Architecture/Code Map|Code Map]]", "[[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]", "[[Home]]", "[[05 - UI-UX/Components|Components]]", "[[05 - UI-UX/Logo|Logo]]"]
---

# Design Principles

Approved. The exact, binding values are in [[05 - UI-UX/Style|Style]]; this note keeps the reasons.

Direction comes from the ui-ux-pro-max skill (`--design-system` for "devops admin dashboard infrastructure minimal", style "Minimalism & Swiss", palette "Developer Tool / IDE", font pairing "Dashboard Data"), adjusted where the result clashed with our rules:
- The suggested green accent was dropped: green means "healthy" here, so the accent is blue and green is status only.
- The suggested Fira Code headings were dropped for readability: Fira Code is only for values (hosts, ports, rules, YAML).

## Rules

1. **Hierarchy first.** One page title, one primary action per page, sections in cards. Big numbers only for the stats that matter.
2. **Solid colors.** No gradients, glows, blobs or glass. Borders separate things; shadows only on overlays (drawer, dialog, toast, tooltip).
3. **Color has meaning.** Neutrals for structure, blue for "you can act here", green / amber / red for status, always with a text label or icon too, never color alone.
4. **Icons where they help scanning.** Sidebar items, stat labels, severity, empty states. Not inside every button or table cell. One set: Lucide, 18px in navigation, 16px inline, stroke 1.75. Icon-only buttons get an `aria-label` and a tooltip. See [[00 - Downloaded Docs/Lucide/lucide/advanced/accessibility|Lucide accessibility]].
5. **Traefik values in mono.** Anything the user could copy into a config is Fira Code.
6. **Navigation is always visible and labeled.** Grouped sidebar, active item marked with a tint and a 3px bar, breadcrumb in the top bar. Collapsed sidebar shows tooltips. Mobile uses a drawer behind the same toggle.
7. **One place per task.** Other pages link to the place where the task lives, with fields prefilled.
8. **Every state is designed.** Default, hover, focus, active, disabled, loading, empty, error. See the Components page in the preview.
9. **Forms explain themselves.** Visible labels, hint under the field, error under the field in words, "Advanced" sections closed by default, generated YAML preview on every config form.
10. **Short human copy.** "1 of 2 servers down", not "Service degradation detected".

## Tokens (see [[05 - UI-UX/Style|Style]] for the final table)

| Group | Values |
|---|---|
| Spacing | 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48 |
| Type | Fira Sans 400 / 500 / 600. Sizes 12, 13, 15 (base), 16, 18, 22, 28. Line height 1.5 for text |
| Mono | Fira Code 400 / 500, 13px in tables and code |
| Radius | 6 controls inner, 8 controls, 12 cards, full for badges |
| Elevation | Flat by default. One overlay shadow level |
| Dark | bg `#0D1219`, surface `#141A23`, surface-2 `#1A212C`, border `#252E3B` / `#344052`, text `#E7EBF0` / `#9AA4B2` / `#7D8898`, accent `#2D68CF` |
| Light | bg `#F5F6F8`, surface `#FFFFFF`, border `#E1E5EB` / `#C9D0DA`, text `#121822` / `#4E5968` / `#636E7F`, accent `#2459C6` |
| Status | Dark: success `#43B97F`, warning `#E3A63A`, danger `#EE6464`. Light: `#1C7C4D`, `#A35F08`, `#C33131` |

Base size is 15px, not 16px: the app is dense (tables, forms) and 15px Fira Sans stays readable while fitting more rows. Nothing interactive is under 13px.

Checked contrast (WCAG AA, 4.5:1 for text): every text token on every surface passes. Lowest pairs: white on dark accent 5.26, subtle text on light bg 4.77. Tokens live in [styles.css L4-L79](../../preview/styles.css#L4-L79).

## Motion

| Where | What | Duration |
|---|---|---|
| Hover on rows, nav, buttons | Background color | 120ms linear |
| Press on buttons | Scale to 0.98 | 120ms |
| Page change | Old page fades out, new page children rise 8px and fade in, 45ms stagger, max 6 steps | 90ms out, 360ms in |
| Sidebar toggle | Column width eases; the icon's divider slides, the panel fill shrinks, the chevron turns 180 degrees. Hover nudges the chevron toward where the sidebar will go | 200ms |
| Drawer | Slides in from the right, leaves faster than it comes in | 260ms in, 180ms out |
| Toast | Rises 8px and fades in | 240ms in, 160ms out |
| Switch, details chevron | Knob slide, chevron rotate | 200ms |

Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for entering, `cubic-bezier(0.65, 0, 0.35, 1)` for state changes. With `prefers-reduced-motion: reduce`, everything is instant except loading spinners. Code: [styles.css L229-L255](../../preview/styles.css#L229-L255) (toggle icon), [styles.css L289-L292](../../preview/styles.css#L289-L292) (page entrance), [styles.css L585-L589](../../preview/styles.css#L585-L589) (reduced motion).

## Accessibility checklist
- Skip link, landmarks (`aside`, `nav`, `header`, `main`), breadcrumb `nav`.
- Visible 2px focus ring on everything.
- Radio groups and switches use proper roles with arrow key support.
- Drawer is a modal dialog: focus moves in, stays in, returns on close, Esc closes.
- Collapsed sidebar keeps labels for screen readers.
- No horizontal page scroll from 360px up; wide tables scroll inside their card and drop optional columns on small screens.

## Related
- [[05 - UI-UX/Preview|Preview]]
- [[01 - Vision/Plan|Plan]]
- [[01 - Vision/Vision|Vision]]
- [[00 - Downloaded Docs/Lucide/README|Lucide docs]]
- [[00 - Downloaded Docs/Google Fonts/README|Google Fonts docs]]
- [[04 - Architecture/Code Map|Code Map]]
- [[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]
- [[Home]]
- [[05 - UI-UX/Components|Components]]
- [[05 - UI-UX/Logo|Logo]]
