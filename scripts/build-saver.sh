#!/usr/bin/env bash
# macOS ekran koruyucusunu derler: build/ASCII Wallpaper.saver
# --install: ayrıca ~/Library/Screen Savers içine kopyalar
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SAVER="$ROOT/build/ASCII Wallpaper.saver"
TMP="$ROOT/build/saver-obj"

rm -rf "$SAVER" "$TMP"
mkdir -p "$SAVER/Contents/MacOS" "$SAVER/Contents/Resources" "$TMP"

SOURCES=("$ROOT"/mac/Saver/*.swift "$ROOT/mac/Sources/AsciiWallpaper/StatsMonitor.swift" "$ROOT/mac/Sources/AsciiWallpaper/ClaudeMonitor.swift")
for ARCH in arm64 x86_64; do
  swiftc -O -module-name AsciiSaver -emit-library \
    -target "$ARCH-apple-macos13.0" \
    -Xlinker -install_name -Xlinker "@rpath/AsciiSaver" \
    -framework AppKit -framework ScreenSaver -framework JavaScriptCore -framework CoreText -framework IOKit \
    -o "$TMP/AsciiSaver-$ARCH" "${SOURCES[@]}"
done
lipo -create "$TMP/AsciiSaver-arm64" "$TMP/AsciiSaver-x86_64" -output "$SAVER/Contents/MacOS/AsciiSaver"
rm -rf "$TMP"

cp "$ROOT/mac/Saver/Info.plist" "$SAVER/Contents/Info.plist"
cp -R "$ROOT/web" "$SAVER/Contents/Resources/web"

# Yerel imza (Apple geliştirici hesabı gerekmez)
codesign --force --deep --sign - "$SAVER"
echo "Hazır: $SAVER"

if [[ "${1:-}" == "--install" ]]; then
  DEST="$HOME/Library/Screen Savers"
  mkdir -p "$DEST"
  rm -rf "$DEST/ASCII Wallpaper.saver"
  cp -R "$SAVER" "$DEST/"
  # Eski örnek bellekte kalmasın diye ekran koruyucu sürecini kapat (açık değilse sorun değil)
  killall legacyScreenSaver 2>/dev/null || true
  echo "Kuruldu: $DEST/ASCII Wallpaper.saver"
  echo "Sistem Ayarları → Ekran Koruyucu'dan 'ASCII Wallpaper'ı seç."
fi
