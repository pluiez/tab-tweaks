#!/bin/sh
# Re-render the extension icons and the store images from their sources
# (store/icon.svg, store/src/*.html). Needs Chrome/Chromium/Edge (override with
# CHROME=/path/to/browser) and ImageMagick.
set -eu
cd "$(dirname "$0")/.."

CHROME=${CHROME:-$(command -v google-chrome || command -v chromium || command -v chromium-browser || command -v microsoft-edge || true)}
[ -n "$CHROME" ] || { echo "No Chrome found; set CHROME=/path/to/chrome" >&2; exit 1; }
CONVERT=$(command -v magick || command -v convert || true)
[ -n "$CONVERT" ] || { echo "ImageMagick (magick/convert) not found" >&2; exit 1; }

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# shot <url> <width> <height> <out.png> [opaque]
# Headless Chrome lays the page out ~87px shorter than --window-size, so render
# into a taller window and crop to the exact size. "opaque" writes a 24-bit PNG
# without alpha, which the Chrome Web Store asks for screenshots and promo tiles.
shot() {
  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 --default-background-color=00000000 \
    --virtual-time-budget=3000 --window-size="$2,$(($3 + 200))" \
    --screenshot="$tmp/shot.png" "$1" >/dev/null 2>&1
  if [ "${5:-}" = opaque ]; then
    "$CONVERT" "$tmp/shot.png" -crop "${2}x${3}+0+0" +repage -background white -alpha remove "PNG24:$4"
  else
    "$CONVERT" "$tmp/shot.png" -crop "${2}x${3}+0+0" +repage "PNG32:$4"
  fi
  echo "$4"
}

# icon <size> <viewBox> <out.png>
icon() {
  { printf '<html><body style="margin:0">'
    sed "s|viewBox=\"[^\"]*\"|viewBox=\"$2\" width=\"$1\" height=\"$1\" style=\"display:block\"|" store/icon.svg
    printf '</body></html>'; } > "$tmp/icon.html"
  shot "file://$tmp/icon.html" "$1" "$1" "$3"
}

mkdir -p icons
icon 128 "0 0 128 128" icons/icon128.png        # keeps the 16px padding the store asks for
for s in 48 32 16; do icon "$s" "12 12 104 104" "icons/icon$s.png"; done
icon 300 "8 8 112 112" store/edge-logo-300.png

src="file://$PWD/store/src"
for lang in en zh; do
  shot "$src/promo.html?lang=$lang" 440 280 "store/promo-440x280-$lang.png" opaque
  for n in 1 2; do
    shot "$src/screenshot.html?shot=$n&lang=$lang" 1280 800 "store/screenshot-$n-$lang.png" opaque
  done
done
