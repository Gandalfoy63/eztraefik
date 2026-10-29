---
title: Preview
tags: [ui-ux, preview]
version: 0.2.0+3
related: ["[[05 - UI-UX/Design Principles|Design Principles]]", "[[01 - Vision/Plan|Plan]]", "[[04 - Architecture/Code Map|Code Map]]", "[[03 - Features/Onboarding|Onboarding]]", "[[03 - Features/Routes|Routes]]", "[[00 - Downloaded Docs/Lucide/README|Lucide docs]]", "[[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]", "[[Home]]"]
---

# Style preview

Approved in 0.1.1+2. The real app now implements this style ([[05 - UI-UX/Style|Style]]); the preview stays as a static reference.

A static page to judge the look and feel before any real code is written. No backend, made-up data, most pages are placeholders.

Open `preview/index.html` in a browser (double-click works, no server needed).

## What to look at

| Page | Shows |
|---|---|
| Overview | Stat cards, "Needs attention" list, recent changes, the traffic path (relations) strip |
| Routes | Table, search, protocol filter, status badges, empty state (search for something that does not exist), the "New route" window (centered, tabs Common and Certificates) with validation, a dot on the tab that has errors, live generated config, loading button and toast |
| Components | Colors of the current theme, type scale, every button state, inputs with hint / error / disabled, switch, badges, alert, skeleton, empty state |
| Onboarding | The setup wizard: 8 steps, Back, Skip, Continue, final "Create Traefik" loading state |
| Other nav items | The placeholder page for pages not in the preview |

Also try: the sidebar toggle (top left), collapsed sidebar tooltips, the theme button (top right), a narrow window (mobile drawer), keyboard only (Tab, arrows in radio groups, Esc).

## New route window
Centered window, two tabs:
- **Common**: Name, Domain, Forwarding to (Docker container or IP address, plus port; the port is prefilled from the container).
- **Certificates**: Serve over HTTPS, then pick a certificate. Only certificates that cover the domain are listed (for example `*.example.com` for `grafana.example.com`), plus "Generate a new certificate" with Let's Encrypt. Redirect HTTP to HTTPS.
- "Generated config" disclosure under both tabs. The tab indicator slides (transform only), panels fade in.

Line links below are from 0.1.0+1 and need a refresh.

## Files
- [index.html](../../preview/index.html): markup. Sidebar [L21-L88](../../preview/index.html#L21-L88), top bar and toggle icon [L91-L109](../../preview/index.html#L91-L109), Overview [L112-L196](../../preview/index.html#L112-L196), Routes [L198-L245](../../preview/index.html#L198-L245), Components [L247-L349](../../preview/index.html#L247-L349), drawer [L372-L450](../../preview/index.html#L372-L450), onboarding [L452-L478](../../preview/index.html#L452-L478).
- [styles.css](../../preview/styles.css): tokens [L4-L79](../../preview/styles.css#L4-L79), shell [L117-L210](../../preview/styles.css#L117-L210), toggle icon [L229-L255](../../preview/styles.css#L229-L255), responsive [L552-L583](../../preview/styles.css#L552-L583).
- [app.js](../../preview/app.js): page switching [L15-L61](../../preview/app.js#L15-L61), sidebar [L63-L92](../../preview/app.js#L63-L92), drawer and form [L213-L296](../../preview/app.js#L213-L296), onboarding [L320-L398](../../preview/app.js#L320-L398).
- `vendor/lucide.min.js`: Lucide 1.56.0 UMD build, vendored so the preview works offline. See [[00 - Downloaded Docs/Lucide/lucide/getting-started|Lucide getting started]].

Fonts load from Google Fonts in the preview only ([[00 - Downloaded Docs/Google Fonts/CSS2 API|CSS2 API]]). Without network the page falls back to system fonts.

## Related
- [[05 - UI-UX/Design Principles|Design Principles]]
- [[01 - Vision/Plan|Plan]]
- [[04 - Architecture/Code Map|Code Map]]
- [[03 - Features/Onboarding|Onboarding]]
- [[03 - Features/Routes|Routes]]
- [[00 - Downloaded Docs/Lucide/README|Lucide docs]]
- [[99 - Changelog/0.1.0+1|Changelog 0.1.0+1]]
- [[Home]]
- [[99 - Changelog/0.1.1+2|Changelog 0.1.1+2]]
