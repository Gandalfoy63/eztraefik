#!/usr/bin/env bash
# Docs: docs/05 - UI-UX/Logo.md
# Encodes the frames from render.js into looping GIFs with ffmpeg: one optimised palette per GIF, no dithering
# (flat colours stay flat). Output: final/gif/.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p final/gif
for dir in build/out/frames/*/; do
  name=$(basename "$dir")                       # for example symbol-light-loop-512
  out="final/gif/${name/-loop/}.gif"            # symbol-light-512.gif
  ffmpeg -v error -y -framerate 25 -i "$dir/%03d.png" \
    -filter_complex "[0:v]split[a][b];[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=none" \
    -loop 0 "$out"
  printf '%-40s %6s KB\n' "$out" "$(( $(stat -c %s "$out") / 1024 ))"
done
