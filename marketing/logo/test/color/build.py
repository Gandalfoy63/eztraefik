#!/usr/bin/env python3
"""Builds the colour versions of the three logo concepts and an overview board (board.html).

Palette: Route Blue for the mark, Signal Orange for the moving part (request / destination), on light, dark and tile.
Run: python3 marketing/logo/color/build.py   (writes SVGs next to this file)
"""
import base64, os

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = base64.b64encode(open(os.path.join(HERE, "..", "..", "fonts", "FiraSans-600-latin.woff2"), "rb").read()).decode()

PALETTE = {
    "blue": "#2D68CF",        # Route Blue: the app accent
    "blue_dark_bg": "#5B8DEF",  # lighter blue for dark backgrounds
    "orange": "#F26B0F",      # Signal Orange on light backgrounds (3.3:1 on white)
    "orange_dark_bg": "#FF8A3D",
    "ink": "#121822",         # wordmark on light
    "paper": "#FFFFFF",
    "night": "#0D1219",       # app dark background
}

# Each concept: the "route" parts (blue) and the "signal" parts (orange), on a 256 grid.
CONCEPTS = {
    "a": {
        "name": "A · Routed e",
        "route": '<path d="M169 128 A72 72 0 1 0 147.9 178.9" fill="none" stroke="{r}" stroke-width="32" stroke-linecap="round"/>'
                 '<path d="M25 128 H185" fill="none" stroke="{r}" stroke-width="32" stroke-linecap="round"/>',
        "signal": '<circle cx="205" cy="128" r="26" fill="{s}"/>',
    },
    "b": {
        "name": "B · Junction",
        "route": '<g transform="translate(13 0)" fill="none" stroke="{r}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round">'
                 '<path d="M40 128 H214"/><path d="M96 128 a32 32 0 0 0 32 -32 a32 32 0 0 1 32 -32 H214"/>'
                 '<path d="M96 128 a32 32 0 0 1 32 32 a32 32 0 0 0 32 32 H214"/></g>',
        "signal": '<circle cx="53" cy="128" r="24" fill="{s}"/>',
    },
    "c": {
        "name": "C · ez path",
        "route": '<path d="M64 64 H192 L64 192 H192" fill="none" stroke="{r}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>'
                 '<circle cx="64" cy="64" r="26" fill="{r}"/>',
        "signal": '<circle cx="192" cy="192" r="26" fill="{s}"/>',
    },
}


def symbol(c, route, signal, bg=None, tile=False):
    body = (c["route"] + c["signal"]).format(r=route, s=signal)
    if tile:
        # App icon: rounded square (22 % radius), mark scaled to 64 % and centred.
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>eztraefik</title>'
                f'<rect width="256" height="256" rx="56" fill="{bg}"/>'
                f'<g transform="translate(46 46) scale(0.64)">{body}</g></svg>')
    rect = f'<rect width="256" height="256" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>eztraefik</title>{rect}{body}</svg>'


def lockup(c, route, signal, ez, rest, bg=None):
    body = (c["route"] + c["signal"]).format(r=route, s=signal)
    rect = f'<rect x="-28" width="956" height="256" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-28 0 956 256"><title>eztraefik</title>'
            f'<style>@font-face{{font-family:"Fira Sans";font-weight:600;src:url(data:font/woff2;base64,{FONT}) format("woff2")}}</style>'
            f'{rect}{body}<text x="270" y="170" font-family="Fira Sans" font-weight="600" font-size="132" letter-spacing="-2">'
            f'<tspan fill="{ez}">ez</tspan><tspan fill="{rest}">traefik</tspan></text></svg>')


P = PALETTE
files = {}
for key, c in CONCEPTS.items():
    files[f"{key}-light.svg"] = symbol(c, P["blue"], P["orange"])
    files[f"{key}-dark.svg"] = symbol(c, P["blue_dark_bg"], P["orange_dark_bg"], bg=P["night"])
    files[f"{key}-tile.svg"] = symbol(c, P["paper"], P["orange_dark_bg"], bg=P["blue"], tile=True)
    files[f"{key}-tile-dark.svg"] = symbol(c, P["blue_dark_bg"], P["orange_dark_bg"], bg=P["night"], tile=True)
    files[f"{key}-lockup-light.svg"] = lockup(c, P["blue"], P["orange"], P["blue"], P["ink"])
    files[f"{key}-lockup-dark.svg"] = lockup(c, P["blue_dark_bg"], P["orange_dark_bg"], P["blue_dark_bg"], "#E7EBF0", bg=P["night"])
for name, svg in files.items():
    open(os.path.join(HERE, name), "w").write(svg)

# Overview board: each concept on light, on dark, as tiles, lockups, and real small sizes.
def img(name, w, h=None):
    return f'<img src="{name}" width="{w}" height="{h or w}" alt="">'

cards = []
for key, c in CONCEPTS.items():
    cards.append(f'''
<section class="card">
  <h2>{c["name"]}{' <span class="rec">Recommended</span>' if key == "a" else ''}</h2>
  <div class="row">
    <div class="sw light">{img(f"{key}-light.svg", 150)}</div>
    <div class="sw dark">{img(f"{key}-dark.svg", 150)}</div>
    <div class="sw plain">{img(f"{key}-tile.svg", 150)}</div>
    <div class="sw plain">{img(f"{key}-tile-dark.svg", 150)}</div>
  </div>
  <div class="lock light">{img(f"{key}-lockup-light.svg", 520, 148)}</div>
  <div class="lock dark">{img(f"{key}-lockup-dark.svg", 520, 148)}</div>
  <div class="sizes">
    <span>{img(f"{key}-tile.svg", 64)}<small>64</small></span>
    <span>{img(f"{key}-tile.svg", 32)}<small>32</small></span>
    <span>{img(f"{key}-tile.svg", 16)}<small>16</small></span>
    <span>{img(f"{key}-light.svg", 32)}<small>32</small></span>
    <span>{img(f"{key}-light.svg", 16)}<small>16</small></span>
    <span class="dk">{img(f"{key}-dark.svg", 32)}<small>32</small></span>
    <span class="dk">{img(f"{key}-dark.svg", 16)}<small>16</small></span>
  </div>
</section>''')

swatches = "".join(
    f'<div class="chip"><i style="background:{v}"></i><b>{n}</b><code>{v}</code></div>'
    for n, v in [("Route Blue", P["blue"]), ("Route Blue on dark", P["blue_dark_bg"]), ("Signal Orange", P["orange"]),
                 ("Signal Orange on dark", P["orange_dark_bg"]), ("Ink", P["ink"]), ("Night", P["night"])])

open(os.path.join(HERE, "board.html"), "w").write(f'''<!doctype html>
<html><head><meta charset="utf-8"><title>eztraefik logo, colour</title>
<style>
@font-face{{font-family:"Fira Sans";font-weight:600;src:url(data:font/woff2;base64,{FONT}) format("woff2")}}
body{{margin:0;padding:48px;background:#F5F6F8;font-family:"Fira Sans",system-ui,sans-serif;color:#121822}}
h1{{margin:0 0 4px;font-size:30px}} p.lead{{margin:0 0 24px;color:#4E5968}}
.palette{{display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap}}
.chip{{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E1E5EB;border-radius:10px;padding:8px 12px;font-size:13px}}
.chip i{{width:22px;height:22px;border-radius:6px;display:block}} .chip code{{color:#4E5968}}
.grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}}
.card{{background:#fff;border:1px solid #E1E5EB;border-radius:14px;padding:20px}}
.card h2{{margin:0 0 14px;font-size:19px}} .rec{{font-size:12px;background:#2D68CF;color:#fff;border-radius:99px;padding:3px 9px;vertical-align:3px}}
.row{{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px}}
.sw{{border-radius:12px;display:grid;place-items:center;padding:12px;border:1px solid #E1E5EB}}
.sw.light{{background:#fff}} .sw.dark{{background:#0D1219;border-color:#0D1219}} .sw.plain{{background:#F0F2F5}}
.lock{{border-radius:12px;margin-bottom:10px;padding:6px 0;display:grid;place-items:center;border:1px solid #E1E5EB}}
.lock.light{{background:#fff}} .lock.dark{{background:#0D1219;border-color:#0D1219}} .lock img{{width:100%;height:auto}}
.sizes{{display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-top:12px}}
.sizes span{{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border-radius:8px}} .sizes span.dk{{background:#0D1219}}
.sizes small{{font-size:11px;color:#687384}}
</style></head><body>
<h1>eztraefik logo, in colour</h1>
<p class="lead">Route Blue for the path, Signal Orange for what moves through it. Solid colours, no gradients. On white, on the app's dark background, and as app icons.</p>
<div class="palette">{swatches}</div>
<div class="grid">{"".join(cards)}</div>
</body></html>''')
print(f"wrote {len(files)} SVGs and board.html")
