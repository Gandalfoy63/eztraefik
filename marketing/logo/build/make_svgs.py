#!/usr/bin/env python3
# Docs: docs/05 - UI-UX/Logo.md
"""Writes every final SVG: symbol, app icon, lockup and wordmark, light and dark, static, animated once and looping.

Static masters are filled shapes only (route outlined, wordmark as glyph paths): no strokes, no fonts.
Animated files keep the route as a stroke so it can draw itself; they show the finished logo when reduced motion is on.
Needs build/out/wordmark.json (outline.py). Output: final/svg/.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "final", "svg")
WM = json.load(open(os.path.join(ROOT, "build", "out", "wordmark.json")))

# ---------- Geometry (256 grid) ----------
ROUTE = "M64 64 H192 L64 192 H192"  # the z, stroke 30, round caps and joins, exact 45 degrees
# The same route as a filled outline: offset 15 on both sides, round joins outside, miter points inside, round caps.
ROUTE_FILL = ("M64 49 H192 A15 15 0 0 1 202.6066 74.6066 L100.2132 177 H192 A15 15 0 0 1 192 207 H64 "
              "A15 15 0 0 1 53.3934 181.3934 L155.7868 79 H64 A15 15 0 0 1 64 49 Z")
START, END, DOT_R = (64, 64), (192, 192), 26
TILE_RX, TILE_INSET, TILE_SCALE = 56, 46, 0.64

# ---------- Colours ----------
THEMES = {
    "light": {"route": "#2D68CF", "start": "#163A7A", "end": "#F26B0F", "ez": "#2D68CF", "rest": "#121822"},
    "dark": {"route": "#5B8DEF", "start": "#2D68CF", "end": "#FF8A3D", "ez": "#5B8DEF", "rest": "#E7EBF0"},
}
ICONS = {
    "light": {"tile": "#2D68CF", "route": "#FFFFFF", "start": "#102B5C", "end": "#FF8A3D"},
    "dark": {"tile": "#0D1219", "route": "#5B8DEF", "start": "#2D68CF", "end": "#FF8A3D"},
}

# ---------- Layout ----------
MARGIN = 38  # the mark's own margin in its 256 box; the lockup keeps it on the right too
wx0, wy0, wx1, wy1 = WM["bounds"]
LOCKUP_W = round(wx1 + MARGIN)
WORD_BOX = (round(wx0 - 8), round(wy0 - 8), round(wx1 - wx0 + 16), round(wy1 - wy0 + 16))
EZ = "".join(f'<path d="{l["d"]}"/>' for l in WM["letters"][:2])
TRAEFIK = "".join(f'<path d="{l["d"]}"/>' for l in WM["letters"][2:])

# ---------- Animation timeline (ms) ----------
EASE_ROUTE, EASE_OUT, SPRING = "cubic-bezier(0.65,0,0.35,1)", "cubic-bezier(0.22,1,0.36,1)", "cubic-bezier(0.34,1.56,0.64,1)"
# (selector, from, to, delay, duration, easing, hidden before, hidden after)
TIMELINE = [
    (".s", "transform:scale(0)", "transform:scale(1)", 0, 320, SPRING, False, False),
    (".r", "stroke-dashoffset:1", "stroke-dashoffset:0", 180, 760, EASE_ROUTE, False, False),
    (".q", "offset-distance:0%", "offset-distance:100%", 180, 760, EASE_ROUTE, True, True),
    (".e", "transform:scale(.5)", "transform:scale(1)", 900, 420, SPRING, True, False),
    (".p", "opacity:.7;transform:scale(1)", "opacity:0;transform:scale(2.1)", 960, 620, EASE_OUT, True, False),
    (".word", "transform:translateY(14px)", "transform:none", 620, 560, EASE_OUT, False, False),
    (".w1", "opacity:0", "opacity:1", 620, 420, "linear", False, False),
    (".w2", "opacity:0", "opacity:1", 740, 420, "linear", False, False),
]
ONCE_MS, LOOP_MS = 1600, 3200


def keyframes(name, frm, to, d, t, ease, hide_before, hide_after, cycle):
    """One CSS keyframes rule that encodes the delay and the hold inside a cycle, so all parts share one clock."""
    p0, p1 = 100 * d / cycle, 100 * (d + t) / cycle
    # Elements hidden outside their slot get opacity:1 while they play, unless their own states set opacity (the ripple).
    show = ";opacity:1" if (hide_before or hide_after) and "opacity" not in frm + to else ""
    stops = []
    if hide_before and p0 > 0:
        stops.append(f"0%,{p0 - 0.01:.2f}%{{{frm};opacity:0}}")
    elif p0 > 0:
        stops.append(f"0%{{{frm}{show}}}")
    stops.append(f"{p0:.2f}%{{{frm}{show};animation-timing-function:{ease}}}")
    if hide_after:
        stops.append(f"{p1 - 0.01:.2f}%{{{to}{show}}}")
        stops.append(f"{p1:.2f}%,100%{{{to};opacity:0}}")
    else:
        stops.append(f"{p1:.2f}%,100%{{{to}{show}}}")
    return f"@keyframes {name}{{{''.join(stops)}}}"


def anim_css(loop, parts):
    cycle = LOOP_MS if loop else ONCE_MS
    rules, uses = [], []
    for i, (sel, frm, to, d, t, ease, hb, ha) in enumerate(TIMELINE):
        if sel.lstrip(".") not in parts:
            continue
        rules.append(keyframes(f"k{i}", frm, to, d, t, ease, hb, ha, cycle))
        uses.append(f"{sel}{{animation:k{i} {cycle}ms linear {'infinite' if loop else '1'} both}}")
    # Base styles are the finished logo, so reduced motion (and anything without CSS animation) shows it complete.
    base = (".r{stroke-dasharray:1 1}.q{opacity:0;offset-path:path('" + ROUTE + "');offset-rotate:0deg;offset-distance:100%}"
            ".p{opacity:0}.s,.e,.p,.word{transform-box:fill-box;transform-origin:center}")
    return f"<style>{base}@media (prefers-reduced-motion:no-preference){{{''.join(rules)}{''.join(uses)}}}</style>"


def mark(c, animated):
    if not animated:
        return (f'<path fill="{c["route"]}" d="{ROUTE_FILL}"/>'
                f'<circle fill="{c["start"]}" cx="{START[0]}" cy="{START[1]}" r="{DOT_R}"/>'
                f'<circle fill="{c["end"]}" cx="{END[0]}" cy="{END[1]}" r="{DOT_R}"/>')
    return (f'<path class="r" d="{ROUTE}" pathLength="1" fill="none" stroke="{c["route"]}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle class="s" fill="{c["start"]}" cx="{START[0]}" cy="{START[1]}" r="{DOT_R}"/>'
            f'<circle class="p" fill="none" stroke="{c["end"]}" stroke-width="6" cx="{END[0]}" cy="{END[1]}" r="{DOT_R}"/>'
            f'<circle class="e" fill="{c["end"]}" cx="{END[0]}" cy="{END[1]}" r="{DOT_R}"/>'
            f'<circle class="q" fill="{c["end"]}" r="13"/>')


def words(c, animated):
    if not animated:
        return f'<g fill="{c["ez"]}">{EZ}</g><g fill="{c["rest"]}">{TRAEFIK}</g>'
    return f'<g class="word"><g class="w1" fill="{c["ez"]}">{EZ}</g><g class="w2" fill="{c["rest"]}">{TRAEFIK}</g></g>'


def svg(view, body, style="", label="eztraefik"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" role="img" aria-label="{label}">'
            f'<title>{label}</title>{style}{body}</svg>\n')


MARK_PARTS = {"s", "r", "q", "e", "p"}
WORD_PARTS = {"word", "w1", "w2"}
files = {}
for theme, c in THEMES.items():
    for kind in ("static", "animated", "loop"):
        a = kind != "static"
        suffix = "" if kind == "static" else f"-{kind}"
        style = lambda parts: anim_css(kind == "loop", parts) if a else ""
        files[f"{kind}/symbol-{theme}{suffix}.svg"] = svg("0 0 256 256", mark(c, a), style(MARK_PARTS))
        files[f"{kind}/lockup-{theme}{suffix}.svg"] = svg(f"0 0 {LOCKUP_W} 256", mark(c, a) + words(c, a), style(MARK_PARTS | WORD_PARTS))
        files[f"{kind}/wordmark-{theme}{suffix}.svg"] = svg(" ".join(map(str, WORD_BOX)), words(c, a), style(WORD_PARTS))
for theme, c in ICONS.items():
    for kind in ("static", "animated", "loop"):
        a = kind != "static"
        suffix = "" if kind == "static" else f"-{kind}"
        body = (f'<rect width="256" height="256" rx="{TILE_RX}" fill="{c["tile"]}"/>'
                f'<g transform="translate({TILE_INSET} {TILE_INSET}) scale({TILE_SCALE})">{mark(c, a)}</g>')
        files[f"{kind}/icon-{theme}{suffix}.svg"] = svg("0 0 256 256", body, anim_css(kind == "loop", MARK_PARTS) if a else "", "eztraefik app icon")

# Square, full-bleed tiles: iOS / Android round the corners themselves; also the Docker Hub avatar.
for theme, c in ICONS.items():
    body = (f'<rect width="256" height="256" fill="{c["tile"]}"/>'
            f'<g transform="translate({TILE_INSET} {TILE_INSET}) scale({TILE_SCALE})">{mark(c, False)}</g>')
    files[f"static/icon-{theme}-square.svg"] = svg("0 0 256 256", body, "", "eztraefik app icon")

# One-colour versions (print, stamps, single-colour contexts): the route and both dots in one ink.
for name, ink in (("black", "#121822"), ("white", "#FFFFFF")):
    one = {"route": ink, "start": ink, "end": ink, "ez": ink, "rest": ink}
    files[f"static/symbol-mono-{name}.svg"] = svg("0 0 256 256", mark(one, False))
    files[f"static/lockup-mono-{name}.svg"] = svg(f"0 0 {LOCKUP_W} 256", mark(one, False) + words(one, False))

for rel, content in files.items():
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w").write(content)
json.dump({"lockup_width": LOCKUP_W, "word_box": WORD_BOX, "once_ms": ONCE_MS, "loop_ms": LOOP_MS},
          open(os.path.join(ROOT, "build", "out", "geometry.json"), "w"))
print(f"wrote {len(files)} SVGs, lockup {LOCKUP_W}x256, wordmark box {WORD_BOX}")
