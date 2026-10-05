// Otomatik üretildi: node scripts/themes-manifest.mjs — elle düzenleme.
// Sayfa tarayıcıda depodan açılınca (geliştirme, önizlemeler, GIF'ler) depodaki tüm paketleri yükler (bkz. web/js/packs.js).
(function (G) {
  const packs = [{"id":"hyprland","name":"Hyprland","scripts":["hyprland/js/hypr/honkadaloonga.data.js","hyprland/js/hypr/kath.data.js","hyprland/js/hypr/end4.data.js","hyprland/js/hypr/alba4k.data.js","hyprland/js/hypr/corndog.data.js","hyprland/js/hypr/meptl.data.js","hyprland/js/hypr/sollee.data.js","hyprland/js/hypr/srev.data.js","hyprland/js/hypr/vdawg.data.js","hyprland/js/hypr.js"]},{"id":"anime","name":"Anime","scripts":["anime/js/deathnote/misa.data.js","anime/js/deathnote.js","anime/js/light/light.data.js","anime/js/light.js","anime/js/sunny/sunny.data.js","anime/js/sunny.js"]}];
  let html = "";
  for (const p of packs) {
    html += `<script>AW.beginPack(${JSON.stringify({ id: p.id, name: p.name })})<\/script>`;
    for (const s of p.scripts) html += `<script src="../packs/${s}"><\/script>`;
    html += "<script>AW.endPack()<\/script>";
  }
  G.document.write(html);
})(globalThis);
