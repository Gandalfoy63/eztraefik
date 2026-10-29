# eztraefik logo: exploration (test)

How the logo was found: three directions in black, then in colour, then the chosen one refined and animated. **The final logo is in `../final/`.** Paths below are relative to this `test/` folder.

| | Concept | Idea | Risk |
|---|---|---|---|
| **A** (recommended) | Routed e | The e of eztraefik, its crossbar routed out of the letter to a destination dot | A little like a plug icon |
| B | Junction | One line in, three lanes out, drawn like a transit map | Reads as a trident or pitchfork |
| C | ez path | The z of "ez" as one route from a start dot to an end dot | More generic: a letter with dots |

## Files
- `concepts.png`: all three side by side, with lockups and true 64 / 32 / 16 px sizes. In this sheet the wordmark falls back to a serif font and the big mark A looks slightly cut at the top and bottom; both are limits of the sheet tool. The correct versions are in `renders/`.
- `renders/*-symbol-v2.png`: each mark at 512 px (v2 = optically centred; v1 = first draft).
- `renders/*-lockup.png`: mark + wordmark in Fira Sans 600.
- `concepts/*.svg`: the source drawings. Strokes and live text are still used here; the final master gets filled outlines and the wordmark as paths.
- `fonts/`: Fira Sans 600 (SIL Open Font License), used by the lockups.

## Colour (`color/`)
Open **`color/board.png`** (or `color/board.html` in a browser): every concept on white, on the app's dark background, as app icons, as lockups, and at 64 / 32 / 16 px.

| Colour | Hex | Role |
|---|---|---|
| Route Blue | `#2D68CF` | the path: the mark, and "ez" in the wordmark (the app's accent) |
| Route Blue on dark | `#5B8DEF` | the same on dark backgrounds |
| Signal Orange | `#F26B0F` | what moves through it: the destination dot, the request |
| Signal Orange on dark | `#FF8A3D` | the same on dark backgrounds and on blue tiles |
| Ink | `#121822` | "traefik" in the wordmark on light |
| Night | `#0D1219` | dark background (the app's) |

Files per concept (`a`, `b`, `c`): `-light.svg`, `-dark.svg`, `-tile.svg` (blue app icon), `-tile-dark.svg`, `-lockup-light.svg`, `-lockup-dark.svg`, plus `-tile-512.png` and `-lockup-light.png`. `build.py` regenerates them all.

## Chosen: C, with a darker start dot (`c/`)
Open **`c/board.png`**: the previous C next to two darker start dots. The route now reads dark origin, blue path, orange destination.

| Variant | Start dot on light / dark / blue tile | Note |
|---|---|---|
| **Deep blue** (recommended) | `#163A7A` / `#2D68CF` / `#102B5C` | Same family as the route; stays the darker dot on every background |
| Ink | `#121822` / `#C9D3E3` / `#0D1219` | Strongest contrast on light, but on dark it has to turn light grey, so it is no longer "darker" there |

Files: `c/c-<deep|ink>-light.svg`, `-dark.svg`, `-tile.svg`, `-tile-dark.svg`, `-lockup-light.svg`, `-lockup-dark.svg`, plus `-tile-512.png`, `-lockup-light.png`. `c/build.py` regenerates them.

## Animation (`c/animation.html`)
Open **`c/animation.html`** in a browser (a self-contained file, works offline). Deep blue start version.

1. The deep blue start dot pops in (0 to 320 ms).
2. A request travels the z while the blue route draws behind it (180 to 940 ms).
3. It lands as the orange end dot, with one ripple (900 to 1580 ms).
4. The wordmark rises in, "ez" first, then "traefik" (620 to 1180 ms).

Runs once on load; **Replay**, **Loop every 3 s**, or click a logo to replay just that one. Shown on white, on the app's dark background, and as the app icon at 160 / 64 / 32 px. With reduced motion turned on in the system, the finished logo is shown without animation. Solid colours only; CSS animations, no libraries. `c/animation_build.py` regenerates the page.

## Next
Chosen: **C with the deep blue start**. Next, the kit: colour palette with one-colour and reversed versions, horizontal and stacked lockups, a small-size cut, favicon and app icon, Docker Hub avatar and overview header, and a one-page usage guide. Known item to fix in the kit: in lockup A the mark's stroke looks lighter than the wordmark.
