---
title: Logo
tags: [ui-ux, brand]
version: 1.2.0+8
related: ["[[05 - UI-UX/Style|Style]]", "[[05 - UI-UX/Design Principles|Design Principles]]", "[[08 - Deployment/Docker Image|Docker Image]]", "[[04 - Architecture/Code Map|Code Map]]", "[[00 - Downloaded Docs/fontTools/README|fontTools docs]]", "[[00 - Downloaded Docs/Google Fonts/README|Google Fonts docs]]", "[[99 - Changelog/1.2.0+8|1.2.0+8]]", "[[Home]]"]
---

# Logo

Final in 1.2.0+8. Files: [marketing/logo/final/](../../marketing/logo/final/README.md), preview page `marketing/logo/final/preview.html`.

## The idea
A **z drawn as one route**: a request leaves the deep blue start dot, follows the blue path and arrives at the orange end dot. It is the z of **ez**traefik and what the app does. Chosen from three concepts (routed e, junction, ez path) made with the logo-design skill; the exploration is in `marketing/logo/test/`. The user chose C and asked for a darker start dot (deep blue, picked over ink because it stays the darker dot on dark backgrounds too).

## Construction
- 256 grid. Route `M64 64 H192 L64 192 H192`, 30-unit stroke, round caps and joins, exact 45 degree diagonal. Dots of radius 26 at both ends.
- Static masters are filled shapes: the route outline is computed exactly (round joins outside, miter points inside, round caps) and checked pixel for pixel against the stroked version. Audit score 99/100.
- The wordmark is Fira Sans 600 at 132 units, letter spacing -2, ligatures off, measured by Chromium ([measure.js](../../marketing/logo/build/measure.js)) and outlined with [[00 - Downloaded Docs/fontTools/README|fontTools]]. The only audit warning is two diagonals of the letter k, which belong to the typeface.
- App icon: tile radius 56 (22 %), mark at 64 %. Square tiles for iOS, Android and the Docker Hub avatar.

## Colours
Route Blue `#2D68CF` (the app accent), Deep Blue `#163A7A` (start), Signal Orange `#F26B0F` (end), Ink `#121822`; lighter versions on dark backgrounds. Full table and usage rules: `marketing/logo/final/README.md`. These are brand colours: the app's status colours ([[05 - UI-UX/Style|Style]]) stay reserved for status.

## Animation
1.6 s, CSS only: start dot pops in, the request travels the z while the route draws behind it, it lands as the end dot with one ripple, the name rises in. Looping variant every 3.2 s. Reduced motion shows the finished logo. GIFs are rendered frame by frame (25 fps) and encoded with an optimised palette and no dithering.

## Files
| Folder | Contents |
|---|---|
| `final/svg/static` | 14: symbol, icon, square icon, lockup, wordmark (light, dark) and one-colour versions |
| `final/svg/animated`, `final/svg/loop` | 8 each: symbol, icon, lockup, wordmark (light, dark) |
| `final/png` | 122 transparent PNGs, 16 to 2048 px (lockups 32 to 1024 px high) |
| `final/gif` | 14 looping GIFs (symbol and icon 256 / 512, lockup 600 / 1200, wordmark 800) |
| `final/web` | favicon.ico (16 / 32 / 48), favicon.svg, Apple touch icon, PWA icons, manifest, `<head>` snippet, Docker Hub avatar |

## Build
`marketing/logo/build/build.sh` regenerates everything in about a minute (Chromium and fontTools in containers, ffmpeg on the host): [keyframes](../../marketing/logo/build/make_svgs.py#L57-L75) builds the shared animation clock, [mark](../../marketing/logo/build/make_svgs.py#L90-L101) the mark, [write_ico](../../marketing/logo/build/make_web.py#L15-L27) the favicon.
- [[Home]]
