#!/usr/bin/env bash
# Docs: docs/05 - UI-UX/Logo.md
# Rebuilds every final logo file from the geometry in make_svgs.py. Needs Docker (Chromium and fontTools run in
# containers) and ffmpeg on the host. Usage: marketing/logo/build/build.sh  [--skip-outline]
#   1. measure.js    letter positions of the wordmark, as Chromium lays it out   (Playwright image)
#   2. outline.py    wordmark letters as SVG paths with fontTools                 (python:3.12-slim)
#   3. make_svgs.py  every SVG: static, animated once, loop                       (host python)
#   4. render.js     PNGs at every size and the GIF frames                        (Playwright image)
#   5. make_gifs.sh  GIFs with ffmpeg; make_web.py favicons; make_preview.py preview page
set -euo pipefail
cd "$(dirname "$0")/.."
LOGO=$PWD
PW=mcr.microsoft.com/playwright:v1.64.1-noble
OWNER="$(id -u):$(id -g)"
# playwright-core for the scripts, installed once into build/node_modules (not committed).
[ -d build/node_modules/playwright-core ] || (cd build && npm install --silent --no-save playwright-core@1.64.1)
if [ "${1:-}" != "--skip-outline" ]; then
  docker run --rm -v "$LOGO":/logo -v "$LOGO/build":/build -v "$LOGO/fonts":/logo/fonts:ro -w /logo/build $PW \
    sh -c "NODE_PATH=/logo/build/node_modules node measure.js && chown -R $OWNER /build/out"
  docker run --rm -v "$LOGO":/logo -w /logo python:3.12-slim \
    sh -c "pip install -q --root-user-action=ignore fonttools==4.67.0 brotli==1.2.0 && python build/outline.py && chown -R $OWNER build/out"
fi
python3 -I build/make_svgs.py
docker run --rm -v "$LOGO":/logo -w /logo/build $PW sh -c "NODE_PATH=/logo/build/node_modules node render.js && chown -R $OWNER /logo/final /logo/build"
build/make_gifs.sh
python3 -I build/make_web.py
python3 -I build/make_preview.py
