#!/usr/bin/env bash
# Render review stills for a composition and tile them into contact sheets.
#
#   npm run review -- <CompositionId> <frames> [--safe]
#   npm run review -- ReviewReply-9x16 0,45,90,120,210,270,300,390,449 --safe
#
# <frames> is a comma list: every shot boundary, every hit, and frame 0.
# --safe draws the 9:16 platform safe box over every frame (needs a showSafeZone prop).
#
# Writes to out/review/<CompositionId>/:
#   frames/      full-size PNGs, one per requested frame
#   sheet.png    labelled contact sheet, 4 across, half size
#   phone.png    the same frames at 360px wide, the size a feed shows them
#
# Set REMOTION_BROWSER_EXECUTABLE to use a preinstalled Chrome (cloud sessions).
set -euo pipefail
cd "$(dirname "$0")/.."

comp="${1:?composition id required}"
frames="${2:?comma-separated frame list required}"
safe="${3:-}"

out="out/review/$comp"
rm -rf "$out"
mkdir -p "$out/frames"

args=(render "$comp" "$out/frames" "--frames=$frames" --image-format=png --sequence --log=error)
if [[ -n "${REMOTION_BROWSER_EXECUTABLE:-}" ]]; then
  args+=("--browser-executable=$REMOTION_BROWSER_EXECUTABLE")
fi
if [[ "$safe" == "--safe" ]]; then
  args+=('--props={"showSafeZone":true}')
fi
npx remotion "${args[@]}"

font="public/fonts/Poppins-SemiBold.ttf"
fps="${FPS:-30}" # timestamps only; set FPS for non-30fps compositions

# Label each frame with its number and timestamp, then tile.
mkdir -p "$out/labelled" "$out/small"
for f in "$out"/frames/*.png; do
  name=$(basename "$f" .png)
  n=$((10#${name##*-}))
  ts=$(awk -v n="$n" -v fps="$fps" 'BEGIN { printf "%.2fs", n / fps }')
  ffmpeg -loglevel error -y -i "$f" \
    -vf "scale=iw/2:-1,drawtext=fontfile=$font:text='f$n  $ts':x=20:y=20:fontsize=34:fontcolor=white:box=1:boxcolor=0x15181Ecc:boxborderw=12" \
    "$out/labelled/$name.png"
  ffmpeg -loglevel error -y -i "$f" \
    -vf "scale=360:-1,drawtext=fontfile=$font:text='f$n':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=0x15181Ecc:boxborderw=6" \
    "$out/small/$name.png"
done

count=$(ls "$out/labelled" | wc -l)
cols=4
rows=$(( (count + cols - 1) / cols ))
ffmpeg -loglevel error -y -pattern_type glob -i "$out/labelled/*.png" \
  -vf "tile=${cols}x${rows}:padding=12:margin=12:color=0x2A2D33" -frames:v 1 "$out/sheet.png"
ffmpeg -loglevel error -y -pattern_type glob -i "$out/small/*.png" \
  -vf "tile=${count}x1:padding=8:margin=8:color=0x2A2D33" -frames:v 1 "$out/phone.png"
rm -rf "$out/labelled" "$out/small"

echo "Review sheets: $out/sheet.png and $out/phone.png ($count frames)"
