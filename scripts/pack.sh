#!/usr/bin/env bash
# Tema paketlerini kurar ve kaldırır. Klasik temalar uygulamanın içinde gelir; Hyprland, Anime gibi paketler
# ayrı indirilir ve ~/Library/Application Support/ASCII Wallpaper/packs/<paket>/ içine kopyalanır. Uygulama ve
# ekran koruyucu temaları oradan yükler. Depo seyrek (sparse) klonlandıysa (riceutil böyle klonlar) bir paketin
# dosyaları ancak o paket eklenince indirilir.
#   pack.sh list [--tsv]        paketler ve durumları
#                               --tsv: kimlik, ad, durum (builtin|installed|available), tema sayısı, açıklama
#   pack.sh add <paket>...      indirir ve kurar
#   pack.sh remove <paket>...   kaldırır
#   pack.sh sync                kurulu paketleri depodaki sürümle günceller; paket klasörü hiç yoksa (ilk kurulum ya
#                               da paketlerden önceki bir sürümden güncelleme) depoda bulunan tüm paketleri kurar
# Paket klasörü AW_PACKS_DIR ile değişir.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${AW_PACKS_DIR:-$HOME/Library/Application Support/ASCII Wallpaper/packs}"
CATALOG="$ROOT/web/packs.tsv"

fail() {
  echo "pack: $*" >&2
  exit 1
}

usage() {
  sed -n '6,12p' "$0" | sed 's/^# \{0,1\}//'
}

# Katalogdaki satır: kimlik ad dahili sayı açıklama
catalog_line() {
  awk -F '\t' -v id="$1" '$1 == id { print; found = 1 } END { exit !found }' "$CATALOG"
}

sparse() {
  [ "$(git -C "$ROOT" config --bool core.sparseCheckout 2>/dev/null)" = true ]
}

installed() {
  [ -f "$DIR/$1/pack.json" ]
}

# Çalışan uygulama paketleri yeniden yüklesin; ekran koruyucu bir sonraki açılışta yeni listeyi okur
notify() {
  if command -v osascript >/dev/null 2>&1 && pgrep -x AsciiWallpaper >/dev/null 2>&1; then
    osascript -l JavaScript -e '
      function run() {
        ObjC.import("Foundation");
        var info = $.NSMutableDictionary.alloc.init;
        info.setObjectForKey("reload", "packs");
        $.NSDistributedNotificationCenter.defaultCenter.postNotificationNameObjectUserInfoDeliverImmediately(
          "dev.eymn.ascii-wallpaper.command", "riceutil", info, true);
      }' >/dev/null || true
  fi
  killall legacyScreenSaver 2>/dev/null || true
}

copy_pack() {
  local id="$1"
  mkdir -p "$DIR"
  rm -rf "$DIR/.$id.tmp"
  cp -R "$ROOT/packs/$id" "$DIR/.$id.tmp"
  rm -rf "${DIR:?}/$id"
  mv "$DIR/.$id.tmp" "$DIR/$id"
}

cmd_list() {
  local id name builtin count desc state
  [ -f "$CATALOG" ] || fail "paket kataloğu yok: $CATALOG"
  while IFS=$'\t' read -r id name builtin count desc; do
    [ -n "$id" ] || continue
    if [ "$builtin" = 1 ]; then state=builtin
    elif installed "$id"; then state=installed
    else state=available
    fi
    if [ "${1:-}" = "--tsv" ]; then
      printf '%s\t%s\t%s\t%s\t%s\n' "$id" "$name" "$state" "$count" "$desc"
    else
      case "$state" in
        builtin) state="dahili" ;;
        installed) state="kurulu" ;;
        available) state="indirilebilir" ;;
      esac
      printf '%-10s %-10s %-14s %3s tema  %s\n' "$id" "$name" "$state" "$count" "$desc"
    fi
  done <"$CATALOG"
}

cmd_add() {
  local id line
  [ "$#" -gt 0 ] || fail "kullanım: pack.sh add <paket>..."
  for id in "$@"; do
    line="$(catalog_line "$id")" || fail "böyle bir paket yok: $id (liste: pack.sh list)"
    if [ "$(printf '%s' "$line" | cut -f3)" = 1 ]; then
      echo "$id uygulamanın içinde geliyor, ayrıca kurulmaz."
      continue
    fi
    if [ ! -f "$ROOT/packs/$id/pack.json" ]; then
      sparse || fail "packs/$id depoda yok; depoyu güncelle (git pull)"
      echo "İndiriliyor: $id"
      git -C "$ROOT" sparse-checkout add "packs/$id" || fail "$id indirilemedi"
      [ -f "$ROOT/packs/$id/pack.json" ] || fail "$id indirildi ama pack.json yok"
    fi
    copy_pack "$id"
    echo "Kuruldu: $id ($(printf '%s' "$line" | cut -f4) tema) → $DIR/$id"
  done
  notify
}

cmd_remove() {
  local id rest
  [ "$#" -gt 0 ] || fail "kullanım: pack.sh remove <paket>..."
  for id in "$@"; do
    catalog_line "$id" >/dev/null || installed "$id" || fail "böyle bir paket yok: $id"
    if ! installed "$id"; then
      echo "$id zaten kurulu değil."
      continue
    fi
    rm -rf "${DIR:?}/$id"
    # Seyrek klonda paketin dosyalarını da çalışma ağacından çıkar
    if sparse; then
      rest="$(git -C "$ROOT" sparse-checkout list | grep -vx "packs/$id" || true)"
      # shellcheck disable=SC2086 # klasör adları boşluk içermez
      git -C "$ROOT" sparse-checkout set $rest || true
    fi
    echo "Kaldırıldı: $id"
  done
  notify
}

cmd_sync() {
  local first=0 dir id
  [ -d "$DIR" ] || first=1
  mkdir -p "$DIR"
  for dir in "$ROOT"/packs/*/; do
    id="$(basename "$dir")"
    [ -f "$dir/pack.json" ] || continue
    if [ "$first" = 1 ] || installed "$id"; then
      copy_pack "$id"
      echo "Paket: $id"
    fi
  done
}

sub="${1:-list}"
[ "$#" -gt 0 ] && shift
case "$sub" in
  list) cmd_list "$@" ;;
  add) cmd_add "$@" ;;
  remove) cmd_remove "$@" ;;
  sync) cmd_sync ;;
  -h|--help|help) usage ;;
  *) usage >&2; exit 2 ;;
esac
