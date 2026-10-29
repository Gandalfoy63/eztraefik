#!/usr/bin/env python3
"""Concept C (ez path) with a darker start dot, in two shades, and a comparison board (board.html).

The z is one route: dark start dot (where the request comes from) -> blue path -> orange end dot (where it arrives).
Run: python3 marketing/logo/c/build.py
"""
import base64, os

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = base64.b64encode(open(os.path.join(HERE, "..", "..", "fonts", "FiraSans-600-latin.woff2"), "rb").read()).decode()

BLUE, BLUE_DK = "#2D68CF", "#5B8DEF"          # Route Blue, and its version for dark backgrounds
ORANGE, ORANGE_DK = "#F26B0F", "#FF8A3D"      # Signal Orange, and its version for dark backgrounds / blue tiles
INK, NIGHT, PAPER = "#121822", "#0D1219", "#FFFFFF"

# Start-dot shades to compare. Each gives the colour on light, on dark, and on the blue tile.
SHADES = {
    "deep": {"label": "Deep blue start", "light": "#163A7A", "dark": "#2D68CF", "tile": "#102B5C"},
    "ink": {"label": "Ink start", "light": "#121822", "dark": "#C9D3E3", "tile": "#0D1219"},
}


def mark(path, start, end):
    return (f'<path d="M64 64 H192 L64 192 H192" fill="none" stroke="{path}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle cx="64" cy="64" r="26" fill="{start}"/><circle cx="192" cy="192" r="26" fill="{end}"/>')


def symbol(body, bg=None, tile=False):
    if tile:
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>eztraefik</title>'
                f'<rect width="256" height="256" rx="56" fill="{bg}"/><g transform="translate(46 46) scale(0.64)">{body}</g></svg>')
    rect = f'<rect width="256" height="256" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>eztraefik</title>{rect}{body}</svg>'


def lockup(body, ez, rest, bg=None):
    rect = f'<rect x="-28" width="956" height="256" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-28 0 956 256"><title>eztraefik</title>'
            f'<style>@font-face{{font-family:"Fira Sans";font-weight:600;src:url(data:font/woff2;base64,{FONT}) format("woff2")}}</style>'
            f'{rect}{body}<text x="270" y="170" font-family="Fira Sans" font-weight="600" font-size="132" letter-spacing="-2">'
            f'<tspan fill="{ez}">ez</tspan><tspan fill="{rest}">traefik</tspan></text></svg>')


files = {}
for k, s in SHADES.items():
    files[f"c-{k}-light.svg"] = symbol(mark(BLUE, s["light"], ORANGE))
    files[f"c-{k}-dark.svg"] = symbol(mark(BLUE_DK, s["dark"], ORANGE_DK), bg=NIGHT)
    files[f"c-{k}-tile.svg"] = symbol(mark(PAPER, s["tile"], ORANGE_DK), bg=BLUE, tile=True)
    files[f"c-{k}-tile-dark.svg"] = symbol(mark(BLUE_DK, s["dark"], ORANGE_DK), bg=NIGHT, tile=True)
    files[f"c-{k}-lockup-light.svg"] = lockup(mark(BLUE, s["light"], ORANGE), BLUE, INK)
    files[f"c-{k}-lockup-dark.svg"] = lockup(mark(BLUE_DK, s["dark"], ORANGE_DK), BLUE_DK, "#E7EBF0", bg=NIGHT)
# The previous version (start dot in the path colour) for comparison.
files["c-before-light.svg"] = symbol(mark(BLUE, BLUE, ORANGE))
files["c-before-tile.svg"] = symbol(mark(PAPER, PAPER, ORANGE_DK), bg=BLUE, tile=True)
for n, svg in files.items():
    open(os.path.join(HERE, n), "w").write(svg)


def img(n, w, h=None):
    return f'<img src="{n}" width="{w}" height="{h or w}" alt="">'


cols = [f'''<section class="card before"><h2>Before</h2><p>Start dot in the path colour</p>
  <div class="row"><div class="sw light">{img("c-before-light.svg", 170)}</div><div class="sw plain">{img("c-before-tile.svg", 170)}</div></div></section>''']
for k, s in SHADES.items():
    cols.append(f'''<section class="card"><h2>{s["label"]}</h2><p>Start <code>{s["light"]}</code> on light, <code>{s["dark"]}</code> on dark, <code>{s["tile"]}</code> on the blue tile</p>
  <div class="row">
    <div class="sw light">{img(f"c-{k}-light.svg", 170)}</div><div class="sw dark">{img(f"c-{k}-dark.svg", 170)}</div>
    <div class="sw plain">{img(f"c-{k}-tile.svg", 170)}</div><div class="sw plain">{img(f"c-{k}-tile-dark.svg", 170)}</div>
  </div>
  <div class="lock light">{img(f"c-{k}-lockup-light.svg", 560, 150)}</div>
  <div class="lock dark">{img(f"c-{k}-lockup-dark.svg", 560, 150)}</div>
  <div class="sizes">
    <span>{img(f"c-{k}-tile.svg", 64)}<small>64</small></span><span>{img(f"c-{k}-tile.svg", 32)}<small>32</small></span>
    <span>{img(f"c-{k}-tile.svg", 16)}<small>16</small></span><span>{img(f"c-{k}-light.svg", 32)}<small>32</small></span>
    <span>{img(f"c-{k}-light.svg", 16)}<small>16</small></span><span class="dk">{img(f"c-{k}-dark.svg", 32)}<small>32</small></span>
    <span class="dk">{img(f"c-{k}-dark.svg", 16)}<small>16</small></span>
  </div></section>''')

open(os.path.join(HERE, "board.html"), "w").write(f'''<!doctype html><html><head><meta charset="utf-8"><title>eztraefik logo C, darker start</title>
<style>
@font-face{{font-family:"Fira Sans";font-weight:600;src:url(data:font/woff2;base64,{FONT}) format("woff2")}}
body{{margin:0;padding:44px;background:#F5F6F8;font-family:"Fira Sans",system-ui,sans-serif;color:#121822}}
h1{{margin:0 0 4px;font-size:30px}} .lead{{margin:0 0 24px;color:#4E5968}}
.grid{{display:grid;grid-template-columns:0.6fr 1fr 1fr;gap:20px;align-items:start}}
.card{{background:#fff;border:1px solid #E1E5EB;border-radius:14px;padding:20px}} .card h2{{margin:0;font-size:19px}}
.card p{{margin:4px 0 14px;color:#4E5968;font-size:13px}} code{{font-size:12px}}
.row{{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px}} .before .row{{grid-template-columns:1fr}}
.sw{{border-radius:12px;display:grid;place-items:center;padding:12px;border:1px solid #E1E5EB}}
.sw.light{{background:#fff}} .sw.dark{{background:#0D1219;border-color:#0D1219}} .sw.plain{{background:#F0F2F5}}
.lock{{border-radius:12px;margin-bottom:10px;padding:6px 0;display:grid;place-items:center;border:1px solid #E1E5EB}}
.lock.light{{background:#fff}} .lock.dark{{background:#0D1219;border-color:#0D1219}} .lock img{{width:100%;height:auto}}
.sizes{{display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap}} .sizes span{{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border-radius:8px}}
.sizes span.dk{{background:#0D1219}} .sizes small{{font-size:11px;color:#687384}}
</style></head><body>
<h1>C · ez path, with a darker start</h1>
<p class="lead">Dark start dot (where the request comes from), blue route, orange end dot (where it arrives).</p>
<div class="grid">{"".join(cols)}</div></body></html>''')
print(f"wrote {len(files)} SVGs and board.html")
