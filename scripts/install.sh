#!/usr/bin/env bash
# Uygulamayı derleyip ~/Applications içine kurar, kurulu tema paketlerini günceller (scripts/pack.sh sync),
# ekran koruyucuyu kurar ve uygulamayı başlatır.
# Güncellemek için de aynı komut kullanılır (riceutil wallpaper update bunu çağırır).
#   --no-saver  ekran koruyucuyu kurma
#   --no-open   kurduktan sonra başlatma
# Kurulum klasörü AW_INSTALL_DIR ile değişir (varsayılan ~/Applications).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST_DIR="${AW_INSTALL_DIR:-$HOME/Applications}"
DEST="$DEST_DIR/ASCII Wallpaper.app"
SAVER=1
OPEN=1
for arg in "$@"; do
  case "$arg" in
    --no-saver) SAVER=0 ;;
    --no-open) OPEN=0 ;;
    *) echo "bilinmeyen seçenek: $arg" >&2; exit 2 ;;
  esac
done

"$ROOT/scripts/build-app.sh"

# Çalışan kopyayı kapat ve tamamen çıkmasını bekle
if pkill -x AsciiWallpaper 2>/dev/null; then
  for _ in $(seq 1 50); do
    pgrep -x AsciiWallpaper >/dev/null || break
    sleep 0.1
  done
fi

mkdir -p "$DEST_DIR"
rm -rf "$DEST"
cp -R "$ROOT/build/ASCII Wallpaper.app" "$DEST"
echo "Kuruldu: $DEST"

# Tema paketleri: kurulu olanlar depodaki sürüme güncellenir. Paketlerden önceki bir sürümden geliniyorsa
# depoda ne varsa kurulur, yani eski kurulumda olan temalar kaybolmaz.
"$ROOT/scripts/pack.sh" sync

if [[ $SAVER == 1 ]]; then
  "$ROOT/scripts/build-saver.sh" --install
fi

if [[ $OPEN == 1 ]]; then
  open "$DEST"
  echo "Başlatıldı. Menü çubuğundaki ızgara simgesinden ya da 'riceutil wallpaper' ile yönetebilirsin."
fi
