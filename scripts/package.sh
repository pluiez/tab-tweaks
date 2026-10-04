#!/bin/sh
# Build the upload package for the Chrome Web Store and Edge Add-ons:
# dist/tab-tweaks-<version>.zip, with manifest.json at the root of the zip.
set -eu
cd "$(dirname "$0")/.."

version=$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' manifest.json)
out="dist/tab-tweaks-$version.zip"

mkdir -p dist
rm -f "$out"
zip -qr -X "$out" manifest.json background.js _locales icons
unzip -l "$out"
