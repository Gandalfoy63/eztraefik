---
title: Charts
tags: [ui-ux, charts]
version: 0.2.0+3
related: ["[[05 - UI-UX/Style|Style]]", "[[03 - Features/Stats|Stats]]", "[[05 - UI-UX/Components|Components]]", "[[99 - Changelog/0.2.0+3|0.2.0+3]]", "[[04 - Architecture/Code Map|Code Map]]", "[[Home]]"]
---

# Charts

Made with the dataviz skill's procedure.

- **Form**: one measure per chart, single series, time on x. No dual axis. Requests per second, p95 latency, 4xx per minute, 5xx per minute; the 2xx / 3xx / 4xx / 5xx split is shown as numbers in stat tiles.
- **Why not a stacked status split**: the skill's palette validator failed the four status colors as categories in both themes (light: red and amber 2.1 apart for deuteranopia, 11.3 for normal vision; gray below the chroma floor). Status colors stay reserved for state, and charts use the accent line only.
- **Marks**: 2px line, recessive 1px grid at 0 / half / max (nice rounded max), axis text in the subtle text color, no fill.
- **Interaction**: crosshair + dot + tooltip on pointer move; the chart is focusable and arrow keys move the crosshair; the `aria-label` reads the selected value.
- **Table view**: "Show as table" on the Stats page shows the same points.
- **Sizing**: the SVG measures its container (ResizeObserver) instead of stretching, so text never distorts.
- The Overview sparkline is a bare trend in a stat tile that links to Stats, so it has no hover.

Code: [LineChart](../../web/src/ui/LineChart.tsx#L21-L23), [Sparkline](../../web/src/ui/LineChart.tsx#L118-L127).

## Related
- [[05 - UI-UX/Style|Style]]
- [[03 - Features/Stats|Stats]]
- [[05 - UI-UX/Components|Components]]
- [[99 - Changelog/0.2.0+3|0.2.0+3]]
- [[04 - Architecture/Code Map|Code Map]]
- [[Home]]
