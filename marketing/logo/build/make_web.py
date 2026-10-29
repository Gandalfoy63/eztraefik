#!/usr/bin/env python3
# Docs: docs/05 - UI-UX/Logo.md
"""Web and platform icons from the rendered PNGs: favicon.ico, favicon.svg, Apple touch icon, Android / PWA icons,
site.webmanifest, the <head> snippet, and the Docker Hub avatar. Standard library only.
The ICO embeds PNG images, which every modern browser and Windows Vista+ read.
"""
import json, os, shutil, struct

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG = os.path.join(ROOT, "final", "png", "icon")
WEB = os.path.join(ROOT, "final", "web")
os.makedirs(WEB, exist_ok=True)


def write_ico(pngs, out):
    """ICO with embedded PNG images: header, one directory entry per size, then the PNG data."""
    data = [open(p, "rb").read() for p in pngs]
    sizes = [struct.unpack(">II", d[16:24]) for d in data]  # width, height from the PNG IHDR chunk
    offset = 6 + 16 * len(data)
    entries = b""
    for (w, h), d in zip(sizes, data):
        entries += struct.pack("<BBBBHHII", w % 256, h % 256, 0, 0, 1, 32, len(d), offset)
        offset += len(d)
    with open(out, "wb") as fh:
        fh.write(struct.pack("<HHH", 0, 1, len(data)) + entries + b"".join(data))


write_ico([os.path.join(PNG, f"icon-light-{s}.png") for s in (16, 32, 48)], os.path.join(WEB, "favicon.ico"))
copies = {
    "favicon.svg": os.path.join(ROOT, "final", "svg", "static", "icon-light.svg"),
    "favicon-16.png": os.path.join(PNG, "icon-light-16.png"),
    "favicon-32.png": os.path.join(PNG, "icon-light-32.png"),
    "apple-touch-icon.png": os.path.join(PNG, "icon-light-square-180.png"),
    "icon-192.png": os.path.join(PNG, "icon-light-192.png"),
    "icon-512.png": os.path.join(PNG, "icon-light-512.png"),
    "icon-maskable-512.png": os.path.join(PNG, "icon-light-square-512.png"),
    "dockerhub-avatar-1024.png": os.path.join(PNG, "icon-light-square-1024.png"),
}
for name, src in copies.items():
    shutil.copyfile(src, os.path.join(WEB, name))

json.dump({
    "name": "eztraefik", "short_name": "eztraefik", "theme_color": "#2D68CF", "background_color": "#0D1219", "display": "standalone",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}, open(os.path.join(WEB, "site.webmanifest"), "w"), indent=2)

open(os.path.join(WEB, "head-snippet.html"), "w").write("""<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#2D68CF">
""")
print("web icons:", ", ".join(sorted(os.listdir(WEB))))
