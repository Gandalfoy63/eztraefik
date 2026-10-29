#!/usr/bin/env python3
# Docs: docs/05 - UI-UX/Logo.md
"""Turns the wordmark into glyph outlines (SVG paths) with fontTools, at the positions Chromium measured.

Input: build/out/layout.json (from measure.js), fonts/FiraSans-600-latin.woff2. Output: build/out/wordmark.json
with one path per letter, in the lockup's coordinate system (font size 132, baseline y=170).
Runs in python:3.12-slim with fonttools==4.67.0 and brotli==1.2.0 (woff2 needs brotli).
Reference: docs/00 - Downloaded Docs/fontTools/
"""
import json, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
layout = json.load(open(os.path.join(ROOT, "build", "out", "layout.json")))
font = TTFont(os.path.join(ROOT, "fonts", "FiraSans-600-latin.woff2"))
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
scale = layout["size"] / font["head"].unitsPerEm
base = layout["baseline"]

letters = []
minx = miny = 1e9
maxx = maxy = -1e9
for c in layout["chars"]:
    name = cmap[ord(c["char"])]
    # Font units are y-up; SVG is y-down: scale, flip, and move to the measured pen position.
    matrix = (scale, 0, 0, -scale, c["x"], base)
    pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    glyphs[name].draw(TransformPen(pen, matrix))
    bp = BoundsPen(glyphs)
    glyphs[name].draw(TransformPen(bp, matrix))
    if bp.bounds:
        x0, y0, x1, y1 = bp.bounds
        minx, miny, maxx, maxy = min(minx, x0), min(miny, y0), max(maxx, x1), max(maxy, y1)
    letters.append({"char": c["char"], "d": pen.getCommands()})

out = {"letters": letters, "bounds": [round(minx, 2), round(miny, 2), round(maxx, 2), round(maxy, 2)]}
json.dump(out, open(os.path.join(ROOT, "build", "out", "wordmark.json"), "w"), indent=1)
print("outlined", "".join(l["char"] for l in letters), "bounds", out["bounds"])
