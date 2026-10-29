#!/usr/bin/env python3
"""Writes animation.html: the C logo (deep blue start) animated, as a self-contained preview page.

Story: the dark start dot appears, a request travels the z (the blue route draws behind it), and it lands as the
orange end dot with one ripple; then the wordmark settles. One run is about 1.6 s. Respects prefers-reduced-motion.
Run: python3 marketing/logo/c/animation_build.py
"""
import base64, os

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = base64.b64encode(open(os.path.join(HERE, "..", "..", "fonts", "FiraSans-600-latin.woff2"), "rb").read()).decode()

PATH = "M64 64 H192 L64 192 H192"
THEMES = {
    "light": {"path": "#2D68CF", "start": "#163A7A", "end": "#F26B0F", "ez": "#2D68CF", "rest": "#121822", "bg": "#FFFFFF"},
    "dark": {"path": "#5B8DEF", "start": "#2D68CF", "end": "#FF8A3D", "ez": "#5B8DEF", "rest": "#E7EBF0", "bg": "#0D1219"},
    "tile": {"path": "#FFFFFF", "start": "#102B5C", "end": "#FF8A3D", "bg": "#2D68CF"},
}


def mark(t):
    c = THEMES[t]
    return f'''<g class="mark">
      <path class="route" d="{PATH}" pathLength="1" fill="none" stroke="{c["path"]}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
      <circle class="start" cx="64" cy="64" r="26" fill="{c["start"]}"/>
      <circle class="ripple" cx="192" cy="192" r="26" fill="none" stroke="{c["end"]}" stroke-width="6"/>
      <circle class="end" cx="192" cy="192" r="26" fill="{c["end"]}"/>
      <circle class="request" r="13" fill="{c["end"]}"/>
    </g>'''


def lockup(t):
    c = THEMES[t]
    return f'''<svg class="logo lockup" viewBox="-28 0 956 256" role="img" aria-label="eztraefik">
    {mark(t)}
    <text class="word" x="270" y="170" font-family="Fira Sans" font-weight="600" font-size="132" letter-spacing="-2">
      <tspan class="w w1" fill="{c["ez"]}">ez</tspan><tspan class="w w2" fill="{c["rest"]}">traefik</tspan>
    </text></svg>'''


def tile(size):
    c = THEMES["tile"]
    return f'''<svg class="logo tile" viewBox="0 0 256 256" width="{size}" height="{size}" role="img" aria-label="eztraefik app icon">
    <rect width="256" height="256" rx="56" fill="{c["bg"]}"/><g transform="translate(46 46) scale(0.64)">{mark("tile")}</g></svg>'''


html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>eztraefik logo animation</title>
<style>
@font-face {{ font-family: "Fira Sans"; font-weight: 600; src: url(data:font/woff2;base64,{FONT}) format("woff2"); }}
:root {{ --ease-out: cubic-bezier(0.22, 1, 0.36, 1); --ease-route: cubic-bezier(0.65, 0, 0.35, 1); --spring: cubic-bezier(0.34, 1.56, 0.64, 1); }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; padding: 40px 24px 56px; background: #F5F6F8; color: #121822; font-family: "Fira Sans", system-ui, sans-serif; }}
main {{ max-width: 1100px; margin: 0 auto; }}
h1 {{ margin: 0 0 4px; font-size: 28px; }}
.lead {{ margin: 0 0 20px; color: #4E5968; max-width: 640px; line-height: 1.5; }}
.controls {{ display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }}
button {{ font: inherit; font-weight: 600; height: 40px; padding: 0 18px; border-radius: 8px; border: 0; background: #2D68CF; color: #fff; cursor: pointer;
  transition: background-color 120ms linear, transform 120ms var(--ease-out); }}
button:hover {{ background: #2F6FDB; }} button:active {{ transform: scale(0.98); }}
button:focus-visible, input:focus-visible {{ outline: 2px solid #2459C6; outline-offset: 2px; }}
label {{ display: inline-flex; align-items: center; gap: 8px; font-size: 15px; cursor: pointer; }}
input[type=checkbox] {{ width: 18px; height: 18px; accent-color: #2D68CF; }}
.note {{ font-size: 13px; color: #687384; }}
.stage {{ display: grid; gap: 16px; }}
.card {{ border-radius: 14px; border: 1px solid #E1E5EB; padding: 28px; display: grid; place-items: center; cursor: pointer; }}
.card.light {{ background: #fff; }} .card.dark {{ background: #0D1219; border-color: #0D1219; }}
.card .lockup {{ width: min(760px, 100%); height: auto; overflow: visible; }}
.row {{ display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }}
.icons {{ background: #F0F2F5; display: flex; gap: 28px; align-items: flex-end; justify-content: center; flex-wrap: wrap; }}
.icons figure {{ margin: 0; display: grid; justify-items: center; gap: 8px; }}
.icons figcaption {{ font-size: 12px; color: #687384; }}
.tile {{ overflow: visible; }}
.hint {{ margin-top: 10px; font-size: 13px; color: #687384; text-align: center; }}

/* ---------- The animation ---------- */
/* Final state is the default, so the logo is complete without animation (reduced motion, no JS, print). */
.request {{ opacity: 0; offset-path: path("{PATH}"); offset-rotate: 0deg; offset-distance: 100%; }}
.ripple {{ opacity: 0; transform-box: fill-box; transform-origin: center; }}
.start, .end {{ transform-box: fill-box; transform-origin: center; }}
.route {{ stroke-dasharray: 1 1; stroke-dashoffset: 0; }}

@media (prefers-reduced-motion: no-preference) {{
  .play .start   {{ animation: pop 320ms var(--spring) both; }}
  .play .route   {{ animation: draw 760ms var(--ease-route) 180ms both; }}
  .play .request {{ animation: travel 760ms var(--ease-route) 180ms both; }}
  /* The end dot and ripple wait hidden until the request arrives (fill forwards only, so no early first frame). */
  .play .end     {{ opacity: 0; animation: land 420ms var(--spring) 900ms forwards; }}
  .play .ripple  {{ animation: ripple 620ms var(--ease-out) 960ms forwards; }}
  /* tspans can't move in SVG, so the word rises as a whole and its two parts fade in one after the other */
  .play .word    {{ animation: rise 560ms var(--ease-out) 620ms both; }}
  .play .w       {{ animation: fade 420ms linear both; }}
  .play .w1      {{ animation-delay: 620ms; }}
  .play .w2      {{ animation-delay: 740ms; }}
}}
@keyframes pop     {{ from {{ transform: scale(0); }} to {{ transform: scale(1); }} }}
@keyframes draw    {{ from {{ stroke-dashoffset: 1; }} to {{ stroke-dashoffset: 0; }} }}
@keyframes travel  {{ 0% {{ offset-distance: 0%; opacity: 1; }} 96% {{ opacity: 1; }} 100% {{ offset-distance: 100%; opacity: 0; }} }}
@keyframes land    {{ from {{ opacity: 1; transform: scale(0.5); }} to {{ opacity: 1; transform: scale(1); }} }}
@keyframes ripple  {{ 0% {{ opacity: 0.7; transform: scale(1); }} 100% {{ opacity: 0; transform: scale(2.1); }} }}
@keyframes rise    {{ from {{ transform: translateY(14px); }} to {{ transform: none; }} }}
@keyframes fade    {{ from {{ opacity: 0; }} to {{ opacity: 1; }} }}
.word {{ transform-box: fill-box; }}

@media (max-width: 760px) {{ .row {{ grid-template-columns: 1fr; }} .card {{ padding: 20px; }} }}
</style></head>
<body>
<main>
  <h1>eztraefik logo, animated</h1>
  <p class="lead">A request leaves the deep blue start, travels the z while the route draws behind it, and lands as the orange end dot. About 1.6 seconds, once. Click any logo to replay it.</p>
  <div class="controls">
    <button type="button" id="replay">Replay</button>
    <label><input type="checkbox" id="loop">Loop every 3 s</label>
    <span class="note" id="rm" hidden>Reduced motion is on in your system: the finished logo is shown without animation.</span>
  </div>
  <div class="stage">
    <div class="card light" data-card>{lockup("light")}</div>
    <div class="row">
      <div class="card dark" data-card>{lockup("dark")}</div>
      <div class="card icons" data-card>
        <figure>{tile(160)}<figcaption>App icon, 160</figcaption></figure>
        <figure>{tile(64)}<figcaption>64</figcaption></figure>
        <figure>{tile(32)}<figcaption>32</figcaption></figure>
      </div>
    </div>
  </div>
  <p class="hint">Timing: start dot 0 to 320 ms, route and request 180 to 940 ms, landing and ripple 900 to 1580 ms, wordmark 620 to 1180 ms.</p>
</main>
<script>
  // Restarting a CSS animation: drop the class, force a reflow, add it back.
  const play = el => {{ el.classList.remove("play"); void el.getBoundingClientRect(); el.classList.add("play"); }};
  const cards = [...document.querySelectorAll("[data-card]")];
  const all = () => cards.forEach(play);
  document.getElementById("replay").addEventListener("click", all);
  cards.forEach(c => c.addEventListener("click", () => play(c)));
  let timer = null;
  document.getElementById("loop").addEventListener("change", e => {{
    clearInterval(timer);
    if (e.target.checked) {{ all(); timer = setInterval(all, 3000); }}
  }});
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) document.getElementById("rm").hidden = false;
  requestAnimationFrame(all);
</script>
</body></html>'''

open(os.path.join(HERE, "animation.html"), "w").write(html)
print("wrote animation.html", len(html) // 1024, "KB")
