---
title: Style
tags: [ui-ux, design-system]
version: 0.2.0+3
related: ["[[05 - UI-UX/Design Principles|Design Principles]]", "[[05 - UI-UX/Components|Components]]", "[[05 - UI-UX/Navigation|Navigation]]", "[[05 - UI-UX/Charts|Charts]]", "[[05 - UI-UX/Preview|Preview]]", "[[04 - Architecture/Frontend|Frontend]]", "[[00 - Downloaded Docs/Lucide/README|README]]", "[[00 - Downloaded Docs/Google Fonts/README|README]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[01 - Vision/Plan|Plan]]", "[[04 - Architecture/Code Map|Code Map]]", "[[Home]]"]
---

# Style

**Binding.** The style approved from the preview (0.1.1+2), with the change asked for in review: creating a route happens in a centered window with Common and Certificates tabs. Principles and reasons: [[05 - UI-UX/Design Principles|Design Principles]]. Tokens live in [web/src/styles.css](../../web/src/styles.css) (`:root`), app components in [web/src/app.css](../../web/src/app.css). Components never use raw hex values.

## Color
| Role | Dark | Light | Use |
|---|---|---|---|
| bg | `#0D1219` | `#F5F6F8` | page |
| surface / surface-2 / hover | `#141A23` / `#1A212C` / `#1F2734` | `#FFFFFF` / `#F0F2F5` / `#EBEEF2` | cards, inputs on cards, hover |
| border / border-strong | `#252E3B` / `#344052` | `#E1E5EB` / `#C9D0DA` | separators / controls |
| text / muted / subtle | `#E7EBF0` / `#9AA4B2` / `#7D8898` | `#121822` / `#4E5968` / `#636E7F` | |
| accent (+ hover, press) | `#2D68CF` | `#2459C6` | primary actions, active nav, chart lines (`accent-text`) |
| success / warning / danger | `#43B97F` / `#E3A63A` / `#EE6464` | `#1C7C4D` / `#A35F08` / `#C33131` | status only, always with a label or icon |

All text pairs pass WCAG AA (checked with a contrast script in 0.1.0+1; lowest: white on accent 5.26, subtle on light bg 4.77).

## Type
Fira Sans 400 / 500 / 600, Fira Code 400 / 500 for anything copyable (hosts, ports, rules, YAML). Sizes 12, 13, 15 (base), 16, 18, 22, 28. Self-hosted woff2, latin and latin-ext.

## Space, shape, depth
4px grid (4 to 48). Radius 6 / 8 / 12 / full. Flat surfaces with 1px borders; one overlay shadow for windows, tooltips and toasts. No gradients anywhere.

## Icons
Lucide ([[00 - Downloaded Docs/Lucide/react/getting-started|lucide-react]]): 18px in navigation and buttons, 16px inline (`icon-sm`), stroke 1.75, `aria-hidden` when next to text. Icon-only buttons have `aria-label` and a tooltip.

## Motion
| Where | Motion | Time |
|---|---|---|
| Page change | old page fades out, new sections rise 8px and fade in, 45ms stagger (max 6) | 90 / 360ms |
| Sidebar toggle | column eases; icon divider slides, panel fill shrinks, chevron turns 180 degrees; hover nudges the chevron | 200ms |
| Window | fade + rise from 98% scale, closes faster | 240 / 140ms |
| Tabs | underline slides (transform only), panel fades in | 260ms |
| Hover, press | color change; buttons scale to 0.98 on press | 120ms |
| Toast | rises 8px | 240 / 160ms |

`prefers-reduced-motion: reduce` makes everything instant except loading spinners.

## Related
- [[05 - UI-UX/Design Principles|Design Principles]]
- [[05 - UI-UX/Components|Components]]
- [[05 - UI-UX/Navigation|Navigation]]
- [[05 - UI-UX/Charts|Charts]]
- [[05 - UI-UX/Preview|Preview]]
- [[04 - Architecture/Frontend|Frontend]]
- [[00 - Downloaded Docs/Lucide/README|README]]
- [[00 - Downloaded Docs/Google Fonts/README|README]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[01 - Vision/Plan|Plan]]
- [[04 - Architecture/Code Map|Code Map]]
- [[Home]]
