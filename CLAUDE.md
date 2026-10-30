# CLAUDE.md

Rules for every change in eztraefik. Follow all of them on every commit without being reminded.

eztraefik is a self-hosted web app to run and manage Traefik: the Traefik container and its variables, routes (HTTP, HTTPS, TCP, UDP, custom ports), services (Docker containers and external URLs), middlewares, domains, certificates, Docker relations, stats and logs. Start at `docs/Home.md`; the plan is `docs/01 - Vision/Plan.md`.

## 1. Versioning: `MAJOR.MEDIUM.MINOR+BUILD`

- Source of truth: the `VERSION` file at the repo root. Everything else reads from it; never hardcode the version elsewhere.
- MAJOR: breaking change (architecture rewrite, incompatible API or data model). Resets MEDIUM and MINOR.
- MEDIUM: new backward-compatible feature or significant addition. Resets MINOR.
- MINOR: bug fix, small tweak, refactor, style or wording change.
- BUILD: +1 on **every commit**, no exceptions. Never resets.
- `0.1.0+1` was the start. `1.0.0` = first version usable end to end (definition in the Plan, section 7).
- Commit message starts with the version: `[1.4.2+37] Fix login redirect loop`.
- Every version gets a changelog note in `docs/99 - Changelog/<version>.md` (what changed, why, files and line ranges touched, linked) and a row in `docs/99 - Changelog/Changelog.md`.

## 2. Documentation: Obsidian vault in `/docs`, updated on every commit

- Markdown only. Must stay a valid Obsidian vault.
- Update the docs **before** committing. Code changes without the related doc updates are incomplete. If nothing else in the docs is affected, the changelog entry is still required.
- Structure (add numbered sections when needed, e.g. `07 - Security`, `08 - Deployment`, `09 - Database`):
  - `00 - Downloaded Docs/<Technology>/`: official docs of every external tech
  - `01 - Vision/`, `02 - Tech/`, `03 - Features/`, `04 - Architecture/`, `05 - UI-UX/`, `06 - API/`, `99 - Changelog/`
  - `Home.md`: entry point linking every section
- One note per concept, feature or module. No giant files.
- Every note starts with YAML frontmatter: `title`, `tags`, `version` (version it was last updated in), `related`.

### Downloaded docs
Before writing code that depends on anything that is not our own code (framework, library, CSS framework, language, API, tool):
1. Download the official docs for the parts we use, for the version we use.
2. Convert to Markdown, one file per topic.
3. Store in `docs/00 - Downloaded Docs/<Technology Name>/`.
4. Add a `README.md` there: source URL, version, date downloaded.
5. Link those pages from every note and code reference that uses the tech.
Refer to these local docs instead of guessing APIs. Already downloaded: Traefik v3.7.16, Go 1.27.3 stdlib, Docker Engine API v1.47, React 19, Vite 8, TypeScript, Lucide (vanilla + React), Google Fonts CSS2 API, Docker build and Compose, Pebble, whoami, Nginx Proxy Manager 2.15.1, nginx (directives read at NPM import), lego 5.5.2 (DNS providers), Public Suffix List (embedded data).

### Linking: the vault is one connected graph, no orphan notes
- Note to note: wikilinks `[[03 - Features/Routes|Routes]]`. Links are two-way: if A links to B, B links back. Every note ends with a `## Related` section.
- Note to downloaded docs: link the exact page, e.g. `[[00 - Downloaded Docs/Traefik/reference/install-configuration/entrypoints|Entrypoints]]`.
- Note to code: relative links with line ranges, e.g. `[app.js L15-L61](../../preview/app.js#L15-L61)`.
- Code to note: a short comment at the top of each significant file, class or function: `// Docs: docs/03 - Features/Routes.md`.
- Changelog entries link the feature notes and code lines they changed. Each note links back to the changelog entry of the version it was last updated in.
- When code moves or line numbers shift, update the line links in the same commit.
- `docs/04 - Architecture/Code Map.md` lists every source file with a one-line purpose, a link to it and to its doc note.

## 3. Design: no AI slop

Binding design system: `docs/05 - UI-UX/Design Principles.md` now, `docs/05 - UI-UX/Style.md` once the preview is confirmed. Style: modern, readable, not complex. Use the **ui-ux-pro-max** skill for UI/UX decisions (design system search, UX guideline checks, pre-delivery checklist) and record what it decided in `05 - UI-UX/`.

Forbidden:
- Gradients (backgrounds, text, buttons, borders). Solid colors. At most one gradient in the whole app, only with a written reason.
- Floating, bouncing or hovering decoration, blobs, orbs, glows, heavy shadows, animation without a purpose.
- Emojis anywhere in the UI or the docs. Use Lucide icons only: one library, consistent size (18px nav, 16px inline) and stroke (1.75).
- Unclear menus: hidden navigation, ambiguous labels, icon-only buttons without `aria-label` and tooltip, more than one place to do the same task.
- Inconsistent spacing, random font sizes, low contrast, missing states, layouts that break on mobile.

Required:
- Small documented design system: limited palette with semantic roles, type scale, 4px spacing grid, radius, elevation, icon set, components.
- Navigation: fixed, grouped, labeled sidebar; current page always marked; breadcrumb in the top bar; collapsible on desktop, drawer on mobile.
- Every interactive element has hover, focus, active, disabled, loading, empty and error states.
- Accessibility: WCAG AA contrast, full keyboard use, visible focus, semantic HTML and proper widget roles, labels on inputs.
- Responsive from 360px to wide desktop, no horizontal page scroll.
- Icons only where they help scanning, not everywhere.
- Motion only when it communicates (state change, feedback, entrance): short, subtle, respects `prefers-reduced-motion`. Wanted: light hover feedback where useful, click/press feedback, smooth page entrance on every page change, a distinctive animated sidebar toggle icon. Timings are in Design Principles.
- Copy is short, specific and human. No marketing filler.

## 4. Workflow for every task

1. Read the relevant notes in `/docs` and the relevant `00 - Downloaded Docs`.
2. New external tech needed: download its docs first (section 2).
3. Implement.
4. Update or create the doc notes, links and line references; update the Code Map.
5. Bump `VERSION` and write the changelog entry.
6. Run `python3 tools/relink.py`, then `python3 tools/check_docs.py`, and fix everything it reports.
7. Commit as `[MAJOR.MEDIUM.MINOR+BUILD] Message`.
8. Report briefly: new version, what changed, which notes were updated.

Ask before architecture-level decisions when the brief is ambiguous. For small decisions, pick the sensible default and write it down in the relevant note.

## Current state
- Decided: Go backend (standard library only), React + Vite + TypeScript UI, eztraefik owns the Traefik container, style approved (`docs/05 - UI-UX/Style.md` is binding), "custom APIs" = routes to external URLs.
- Build and test: `docker compose -f dev/compose.yml up -d --build` then `python3 dev/test.py` (fake domains `*.ezt.test`, ports 18080 / 18443, Pebble as ACME). Unit tests: `go test ./...` in `server/` (run in `golang:1.27.3-alpine`, Go is not installed on the host). Web: `npm run build` in `web/`.
- Before committing: `python3 tools/relink.py` (fixes code line links), then `python3 tools/check_docs.py` (must print OK).
- Import from Nginx Proxy Manager: `docker compose -f dev/compose.yml --profile npm up -d`, then `python3 dev/test_npm.py`. Never run it against the real NPM on this host.
- `preview/` is the static style preview, kept as reference.
