---
title: Components
tags: [ui-ux, components]
version: 1.3.0+19
related: ["[[05 - UI-UX/Style|Style]]", "[[05 - UI-UX/Navigation|Navigation]]", "[[04 - Architecture/Frontend|Frontend]]", "[[05 - UI-UX/Design Principles|Design Principles]]", "[[04 - Architecture/Code Map|Code Map]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[Home]]", "[[03 - Features/Route Settings|Route Settings]]", "[[99 - Changelog/1.3.0+19|1.3.0+19]]"]
---

# Components

Shared building blocks. Every interactive one has hover, focus (2px ring), active, disabled, loading, empty and error states.

| Component | Where | Notes |
|---|---|---|
| [Button](../../web/src/ui/feedback.tsx#L135-L137) | everywhere | variants primary / secondary / ghost / danger, `busy` swaps in a spinner and a label like "Saving", blocks double submit |
| [Field](../../web/src/ui/controls.tsx#L6-L8) | forms | visible label, hint below, error below in words with an icon; `invalid()` wires `aria-invalid` and `aria-describedby` |
| [Segmented](../../web/src/ui/controls.tsx#L75-L77) | protocol, type pickers | `radiogroup` with arrow keys |
| [Switch](../../web/src/ui/controls.tsx#L34-L40), [SettingRow](../../web/src/ui/controls.tsx#L43-L53) | on / off settings | `role=switch`, label on the left |
| [TagInput](../../web/src/ui/controls.tsx#L111-L113) | domains, IPs, servers | Enter, comma or space adds, Backspace removes |
| [CheckChips](../../web/src/ui/controls.tsx#L159-L174) | entrypoints, middlewares | checkboxes styled as chips |
| [Modal](../../web/src/ui/Modal.tsx#L7-L9) | create / edit | centered, focus moves in and is trapped, Esc and outside click close, focus returns |
| [Tabs](../../web/src/ui/Modal.tsx#L94-L132) | route window, settings | `tablist`, arrows / Home / End, red dot on a tab with errors |
| [ConfirmDialog](../../web/src/ui/Modal.tsx#L144-L146) | deletes, restarts | the confirm button says what happens ("Delete route") |
| [ToastProvider](../../web/src/ui/feedback.tsx#L17-L50) | after saves | `role=status`, success 5s, errors 9s, dismissable |
| [Badge](../../web/src/ui/feedback.tsx#L54-L56), [statusTone](../../web/src/ui/feedback.tsx#L59-L65) | statuses | dot + text, never color alone |
| [Empty](../../web/src/ui/feedback.tsx#L67-L78), [ErrorBox](../../web/src/ui/feedback.tsx#L80-L94), [SkeletonRows](../../web/src/ui/feedback.tsx#L124-L132) | every list | empty state says what to do next; errors offer Try again |
| [PageHeader](../../web/src/ui/Page.tsx#L5-L15) | every page | one title, one line, one primary action |
| [TooltipLayer](../../web/src/app/Tooltip.tsx#L6-L62) | `data-tooltip` | on hover after 250ms and on keyboard focus; nav items only when the sidebar is collapsed |
| [LineChart](../../web/src/ui/LineChart.tsx#L21-L23) | Stats | see [[05 - UI-UX/Charts|Charts]] |

## Step slider
Native range input over useful steps, with a number box for any exact value and the value written out below. The first step means off. Used in [[03 - Features/Route Settings|Route Settings]]. Code: [StepSlider](../../web/src/ui/controls.tsx#L56-L58).

## Related
- [[05 - UI-UX/Style|Style]]
- [[05 - UI-UX/Navigation|Navigation]]
- [[04 - Architecture/Frontend|Frontend]]
- [[05 - UI-UX/Design Principles|Design Principles]]
- [[04 - Architecture/Code Map|Code Map]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[Home]]
- [[03 - Features/Route Settings|Route Settings]]
- [[99 - Changelog/1.3.0+19|1.3.0+19]]
