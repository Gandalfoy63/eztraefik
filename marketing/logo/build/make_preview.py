#!/usr/bin/env python3
# Docs: docs/05 - UI-UX/Logo.md
"""Writes final/preview.html: every final file on one page (animated, looping, static, GIFs, PNG sizes, web icons)."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = os.path.join(ROOT, "final")


def tile(src, bg, w, label, h=None):
    hh = f' height="{h}"' if h else ""
    return f'<figure class="{bg}"><img src="{src}" width="{w}"{hh} alt="{label}" loading="lazy"><figcaption>{label}</figcaption></figure>'


def section(title, note, body):
    return f'<section><h2>{title}</h2><p class="note">{note}</p><div class="wall">{body}</div></section>'


parts = []
for kind, note in (("animated", "Plays once when the file loads. Reload the page or press Replay to see it again."),
                   ("loop", "Repeats every 3.2 s. For showcases; the once version is better on real pages.")):
    body = ""
    for t in ("light", "dark"):
        body += tile(f"svg/{kind}/lockup-{t}-{kind}.svg", t, 420, f"lockup-{t}-{kind}.svg")
        body += tile(f"svg/{kind}/symbol-{t}-{kind}.svg", t, 150, f"symbol-{t}-{kind}.svg")
        body += tile(f"svg/{kind}/icon-{t}-{kind}.svg", "grey", 150, f"icon-{t}-{kind}.svg")
        body += tile(f"svg/{kind}/wordmark-{t}-{kind}.svg", t, 300, f"wordmark-{t}-{kind}.svg")
    parts.append(section(f"SVG, {'animated once' if kind == 'animated' else 'animated loop'}", note, body))

body = ""
for t in ("light", "dark"):
    body += tile(f"svg/static/lockup-{t}.svg", t, 420, f"lockup-{t}.svg")
    body += tile(f"svg/static/symbol-{t}.svg", t, 150, f"symbol-{t}.svg")
    body += tile(f"svg/static/icon-{t}.svg", "grey", 150, f"icon-{t}.svg")
    body += tile(f"svg/static/icon-{t}-square.svg", "grey", 150, f"icon-{t}-square.svg")
    body += tile(f"svg/static/wordmark-{t}.svg", t, 300, f"wordmark-{t}.svg")
body += tile("svg/static/lockup-mono-black.svg", "light", 420, "lockup-mono-black.svg")
body += tile("svg/static/lockup-mono-white.svg", "dark", 420, "lockup-mono-white.svg")
body += tile("svg/static/symbol-mono-black.svg", "light", 150, "symbol-mono-black.svg")
body += tile("svg/static/symbol-mono-white.svg", "dark", 150, "symbol-mono-white.svg")
parts.append(section("SVG, static masters", "Filled shapes only: no strokes, no fonts needed. Use these in print and design tools.", body))

gifs = sorted(os.listdir(os.path.join(F, "gif")))
body = "".join(tile(f"gif/{g}", "light" if "-light-" in g else "dark", 420 if "lockup" in g or "wordmark" in g else 160, g) for g in gifs)
parts.append(section("GIF", "Looping, 25 fps, on a solid background (white for light, #0D1219 for dark). For places that can't show SVG.", body))

body = ""
for s in (16, 32, 48, 64, 128, 256, 512):
    body += tile(f"png/icon/icon-light-{s}.png", "grey", s, f"icon-light-{s}.png")
for s in (16, 32, 64, 128):
    body += tile(f"png/symbol/symbol-light-{s}.png", "light", s, f"symbol-light-{s}.png")
    body += tile(f"png/symbol/symbol-dark-{s}.png", "dark", s, f"symbol-dark-{s}.png")
for h in (32, 64, 128):
    body += tile(f"png/lockup/lockup-light-{h}h.png", "light", round(h * 821 / 256), f"lockup-light-{h}h.png", h)
parts.append(section("PNG", "Transparent. Symbols and icons at 16 to 2048 px, lockups 32 to 1024 px high, wordmarks 32 to 512 px high. A selection is shown at true size.", body))

body = "".join(tile(f"web/{n}", "grey", 96, n) for n in ("favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-maskable-512.png", "dockerhub-avatar-1024.png"))
parts.append(section("Web and platform icons", "favicon.ico (16 / 32 / 48), favicon.svg, Apple touch icon, Android / PWA icons, site.webmanifest, head-snippet.html, Docker Hub avatar.", body))

open(os.path.join(F, "preview.html"), "w").write(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>eztraefik logo, final files</title>
<style>
* {{ box-sizing: border-box; }}
body {{ margin: 0; padding: 36px 24px 60px; background: #F5F6F8; color: #121822; font-family: system-ui, sans-serif; }}
main {{ max-width: 1240px; margin: 0 auto; }}
header {{ display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }}
h1 {{ margin: 0; font-size: 26px; }} h2 {{ margin: 32px 0 4px; font-size: 18px; }} .note {{ margin: 0 0 14px; color: #4E5968; font-size: 14px; }}
button {{ font: inherit; font-weight: 600; height: 40px; padding: 0 18px; border: 0; border-radius: 8px; background: #2D68CF; color: #fff; cursor: pointer; }}
button:hover {{ background: #2F6FDB; }} button:focus-visible {{ outline: 2px solid #2459C6; outline-offset: 2px; }}
.wall {{ display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }}
figure {{ margin: 0; padding: 14px; border-radius: 12px; border: 1px solid #E1E5EB; display: grid; gap: 8px; justify-items: center; }}
figure img {{ max-width: 100%; height: auto; }}
figure.light {{ background: #fff; }} figure.dark {{ background: #0D1219; border-color: #0D1219; }} figure.grey {{ background: #F0F2F5; }}
figcaption {{ font: 12px ui-monospace, monospace; color: #687384; }} figure.dark figcaption {{ color: #9AA4B2; }}
</style></head><body><main>
<header><h1>eztraefik logo, final files</h1><button type="button" id="replay">Replay animations</button></header>
<p class="note">Everything in <code>final/</code>. Concept C, deep blue start: dark origin, blue route, orange destination.</p>
{"".join(parts)}
</main>
<script>
  // An SVG in an <img> restarts its animation when the image is loaded again.
  document.getElementById("replay").addEventListener("click", () => {{
    document.querySelectorAll('img[src*="-animated.svg"], img[src*="-loop.svg"]').forEach(i => {{ const s = i.getAttribute("src"); i.src = ""; i.src = s; }});
  }});
</script></body></html>''')
print("wrote final/preview.html")
