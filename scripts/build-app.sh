#!/usr/bin/env bash
# macOS uygulama paketini derler: build/ASCII Wallpaper.app
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/build/ASCII Wallpaper.app"

cd "$ROOT/mac"
swift build -c release
BIN="$(swift build -c release --show-bin-path)/AsciiWallpaper"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/AsciiWallpaper"
cp "$ROOT/mac/Info.plist" "$APP/Contents/Info.plist"
cp -R "$ROOT/web" "$APP/Contents/Resources/web"

# Yerel imza (Apple geliştirici hesabı gerekmez)
codesign --force --deep --sign - "$APP"

echo "Hazır: $APP"
